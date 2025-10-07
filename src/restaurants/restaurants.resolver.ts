import { Args, Query, Resolver, Mutation } from '@nestjs/graphql'
import { CreateRestaurantDto } from './dtos/create-restaurant.dto'
import { Restaurant } from './entities/restaurant.entity'

@Resolver(() => Restaurant)
export class RestaurantResolver {
  @Query((returns) => [Restaurant])
  restaurants(@Args('veganOnly') veganOnly: boolean): Restaurant[] {
    return []
  }

  @Mutation(() => Boolean)
  createRestaurant(@Args() createRestaurantDto: CreateRestaurantDto): boolean {
    return true
  }
}
