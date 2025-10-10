import { Field, ObjectType, InputType } from '@nestjs/graphql'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { IsString, IsBoolean, Length, IsOptional } from 'class-validator'

@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field(() => Number)
  id: number

  @Field(() => String)
  @Column()
  @IsString()
  @Length(5)
  name: string

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  @IsOptional()
  @IsBoolean()
  isVegan: boolean

  @Field(() => String)
  @Column()
  @IsString()
  adress: string

  @Field(() => String)
  @Column()
  @IsString()
  ownerName: string

  @Field(() => String)
  @Column()
  @IsString()
  categoryName: string
}
