import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import {
  CreateAccountOutput,
  CreateAccountInput,
} from './dtos/create-account.dto'
import { LoginInput, LoginOutput } from './dtos/login.dto'
import { User } from './entities/user.entity'
import { UsersService } from './users.service'

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => Boolean)
  hi() {
    return true
  }

  @Mutation(() => CreateAccountOutput)
  async createAccount(
    @Args('input') createAccountInput: CreateAccountInput,
  ): Promise<CreateAccountOutput> {
    try {
      return this.usersService.createAccount(createAccountInput)
    } catch (error) {
      return { error, ok: false }
    }
  }

  @Mutation(() => LoginOutput)
  async login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    try {
      return this.usersService.login(loginInput)
    } catch (error) {
      return { error, ok: false }
    }
  }

  @Query(() => User)
  me() {}
}
