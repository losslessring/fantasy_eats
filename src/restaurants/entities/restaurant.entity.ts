import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { IsString, Length } from 'class-validator'
import { CoreEntity } from 'src/common/entities/core.entity'
import { Order } from 'src/orders/entities/order.entity'
import { User } from 'src/users/entities/user.entity'
import { Column, Entity, ManyToOne, OneToMany, RelationId } from 'typeorm'
import { Category } from './category.entity'
import { Dish } from './dish.entity'

@InputType('RestaurantInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Restaurant extends CoreEntity {
  @Field(() => String)
  @Column()
  @IsString()
  @Length(5)
  name: string

  @Field(() => String)
  @Column()
  @IsString()
  coverImg: string

  @Field(() => String)
  @Column()
  @IsString()
  address: string

  @Field(() => String)
  @Column()
  @IsString()
  categoryName: string

  @Field(() => Category, { nullable: true })
  @ManyToOne(() => Category, (category) => category.restaurants, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  category: Category

  @Field((type) => User, { nullable: true })
  @ManyToOne((type) => User, (user) => user.restaurants, {
    nullable: true,
    onDelete: 'CASCADE',
    eager: true,
  })
  owner: User

  @RelationId((restaurant: Restaurant) => restaurant.owner)
  ownerId: number

  @Field(() => [Order])
  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[]

  @Field(() => [Dish])
  @OneToMany(() => Dish, (dish) => dish.restaurant)
  menu: Dish[]

  @Field(() => Boolean)
  @Column({ default: false })
  isPromoted: boolean

  @Field(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'text' })
  promotedUntil: Date | null
}
