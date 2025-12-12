import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Dish } from 'src/restaurants/entities/dish.entity'
import { Restaurant } from 'src/restaurants/entities/restaurant.entity'
import { User, UserRole } from 'src/users/entities/user.entity'
import { Repository } from 'typeorm'
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto'
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto'
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto'
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto'
import { OrderItem } from './entities/order-item.entity'
import { Order, OrderStatus } from './entities/order.entity'

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,

    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,

    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
      })

      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found',
        }
      }
      let orderFinalPrice = 0
      let orderItems: OrderItem[] = []
      for (const item of items) {
        const dish = await this.dishes.findOne({ where: { id: item.dishId } })

        if (!dish) {
          return {
            ok: false,
            error: 'Dish not found',
          }
        }

        if (!item.options) {
          continue
        }

        let dishFinalPrice = dish.price
        for (const itemOption of item.options) {
          const dishOption = dish.options?.find(
            (dishOption) => dishOption.name === itemOption.name,
          )
          if (dishOption) {
            if (dishOption.extra) {
              dishFinalPrice = dishFinalPrice + dishOption.extra
            } else {
              const dishOptionChoice = dishOption.choices?.find(
                (optionChoice) => optionChoice.name === itemOption.choice,
              )
              if (dishOptionChoice) {
                if (dishOptionChoice.extra) {
                  dishFinalPrice = dishFinalPrice + dishOptionChoice.extra
                }
              }
            }
          }
        }
        orderFinalPrice = orderFinalPrice + dishFinalPrice
        const orderItem = await this.orderItems.save(
          this.orderItems.create({ dish, options: item.options }),
        )
        orderItems.push(orderItem)
      }

      await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderFinalPrice,
          items: orderItems,
        }),
      )
      return {
        ok: true,
      }
    } catch (error) {
      return {
        ok: false,
        error: 'Could not create an order',
      }
    }
  }

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    const statusQueryCondition = status ? `AND(status = '${status}')` : ''
    try {
      if (user.role === UserRole.Client) {
        const orders = await this.orders.query(`
          SELECT public.order.id, public.order."createdAt", public.order."updatedAt", "total", "status", "customerId", "driverId", "restaurantId"
          FROM public.order
          JOIN public.restaurant
          ON public.order."restaurantId" = public.restaurant.id
          WHERE ("customerId" = ${user.id}) ${statusQueryCondition} ;
        `)

        return { ok: true, orders }
      } else if (user.role === UserRole.Delivery) {
        const orders = await this.orders.find({
          where: {
            driver: user,
            status,
          },
        })
      } else if (user.role === UserRole.Owner) {
        const orders = await this.orders.query(`
        SELECT public.order.id, public.order."createdAt", public.order."updatedAt", "total", "status", "customerId", "driverId", "restaurantId", "ownerId"
        FROM public.order
        JOIN public.restaurant
        ON public.order."restaurantId" = public.restaurant.id
        WHERE ("ownerId" = ${user.id}) ${statusQueryCondition};
        `)

        return { ok: true, orders }
      }

      return {
        ok: false,
      }
    } catch (error) {
      return {
        ok: false,
        error: 'Could not get orders',
      }
    }
  }

  canSeeOrder(user: User, order: Order): boolean {
    let canSee = true

    if (user.role === UserRole.Client && order.customerId !== user.id) {
      canSee = false
    }
    if (user.role === UserRole.Delivery && order.driverId !== user.id) {
      canSee = false
    }

    if (
      user.role === UserRole.Owner &&
      order?.restaurant?.ownerId !== user.id
    ) {
      canSee = false
    }

    return canSee
  }

  async getOrder(
    user: User,
    { id: orderId }: GetOrderInput,
  ): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id: orderId },
        relations: ['restaurant'],
      })

      if (!order) {
        return {
          ok: false,
          error: 'Order not found',
        }
      }

      if (!this.canSeeOrder(user, order)) {
        return {
          ok: false,
          error: 'Not allowed to access the order information',
        }
      }
      return {
        ok: true,
        order,
      }
    } catch (error) {
      return {
        ok: false,
        error: 'Could not load order',
      }
    }
  }

  async editOrder(
    user: User,
    { id: orderId, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id: orderId },
        relations: ['restaurant'],
      })

      if (!order) {
        return {
          ok: false,
          error: 'Order not found',
        }
      }

      if (!this.canSeeOrder(user, order)) {
        return {
          ok: false,
          error: 'Not allowed to access the order information',
        }
      }

      let canEdit = true

      if (user.role === UserRole.Client) {
        canEdit = false
      }

      if (user.role === UserRole.Owner) {
        if (status !== OrderStatus.Cooking && status !== OrderStatus.Cooked) {
          canEdit = false
        }
      }

      if (user.role === UserRole.Delivery) {
        if (
          status !== OrderStatus.PickedUp &&
          status !== OrderStatus.Delivered
        ) {
          canEdit = false
        }
      }

      if (!canEdit) {
        return {
          ok: false,
          error: 'Not allowed to edit order',
        }
      }

      await this.orders.save([
        {
          id: orderId,
          status,
        },
      ])

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: 'Could not edit order',
      }
    }
  }
}
