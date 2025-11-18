import { Module } from '@nestjs/common'
import { RestaurantResolver } from './restaurants.resolver'
import { Restaurant } from './entities/restaurant.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RestaurantService } from './restaurants.service'
import { Category } from './entities/category.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Category])],
  providers: [RestaurantResolver, RestaurantService],
})
export class RestaurantsModule {}
