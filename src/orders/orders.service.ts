import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  RestaurantInput,
  RestaurantOutput,
} from 'src/restaurants/dtos/restaurant.dto'
import { Restaurant } from 'src/restaurants/entities/restaurant.entity'
import { User } from 'src/users/entities/user.entity'
import { Repository } from 'typeorm'
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto'
import { Order } from './entities/order.entity'

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,

    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
    //): Promise<CreateOrderOutput> {
  ) {
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

      const order = await this.orders.save(
        this.orders.create({ customer, restaurant }),
      )
    } catch (error) {
      return {
        ok: false,
        error: 'Could not find a restaurant',
      }
    }
  }
}
