import { Field, ObjectType, InputType } from '@nestjs/graphql'
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { IsString, IsBoolean, Length, IsOptional } from 'class-validator'
import { CoreEntity } from 'src/common/entities/core.entity'
import { Restaurant } from './restaurant.entity'

@InputType('CategoryInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Field(() => String)
  @Column({ unique: true })
  @IsString()
  @Length(5)
  name: string

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  @IsString()
  coverImg: string

  @Field(() => String)
  @Column({ unique: true })
  @IsString()
  slug: string

  @Field(() => [Restaurant], { nullable: true })
  @OneToMany(() => Restaurant, (restaurant) => restaurant.category)
  restaurants: Restaurant[]
}
