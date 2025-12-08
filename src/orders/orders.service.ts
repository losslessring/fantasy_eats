import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  RestaurantInput,
  RestaurantOutput,
} from 'src/restaurants/dtos/restaurant.dto'
import { Dish } from 'src/restaurants/entities/dish.entity'
import { Restaurant } from 'src/restaurants/entities/restaurant.entity'
import { User, UserRole } from 'src/users/entities/user.entity'
import { Repository } from 'typeorm'
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto'
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto'
import { OrderItem } from './entities/order-item.entity'
import { Order } from './entities/order.entity'

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
    try {
      if (user.role === UserRole.Client) {
        const orders = await this.orders.find({
          where: {
            customer: user,
          },
        })
      } else if (user.role === UserRole.Delivery) {
        const orders = await this.orders.find({
          where: {
            driver: user,
          },
        })
      } else if (user.role === UserRole.Owner) {
        // console.log(user)

        // const restaurants = await this.restaurants.find({
        //   //   where: {
        //   //     owner: user,
        //   //   },
        //   relations: ['orders'],
        // })
        // console.log(restaurants)

        // Find out why not finding restaurants with owner
        // console.log(restaurants)
        // const orders = restaurants
        //   .map((restaurant) => restaurant.orders)
        //   .flat(1)

        const orders = await this.orders.query(`
        SELECT public.order.id, public.order."createdAt", public.order."updatedAt", "total", "status", "customerId", "driverId", "restaurantId", "ownerId"
        FROM public.order
        JOIN public.restaurant
        ON public.order."restaurantId" = public.restaurant.id
        WHERE "ownerId" = ${user.id};
        `)
        console.log(orders)

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
}
