import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql'
import { CoreEntity } from 'src/common/entities/core.entity'
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm'
import { User } from './user.entity'

@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class Verification extends CoreEntity {
  @Column()
  @Field(() => String)
  code: string

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User

  @BeforeInsert()
  createCode(): void {
    this.code = Math.random().toString(36).substring(2)
  }
}
