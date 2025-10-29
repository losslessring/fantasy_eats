import {
  Field,
  InputType,
  ObjectType,
  PartialType,
  PickType,
} from '@nestjs/graphql'
import { CoreOutput } from 'src/common/dtos/output.dto'
import { User } from '../entities/user.entity'
import { Verification } from '../entities/verification.entity'

@ObjectType()
export class VerifyEmailOutput extends CoreOutput {}

@InputType()
export class VerifyEmailInput extends PickType(Verification, ['code']) {}
