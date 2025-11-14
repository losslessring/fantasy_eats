import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { AuthGuard } from 'src/auth/auth.guard'
import {
  CreateAccountOutput,
  CreateAccountInput,
} from './dtos/create-account.dto'
import { LoginInput, LoginOutput } from './dtos/login.dto'
import { User } from './entities/user.entity'
import { UserService } from './users.service'
import { UseGuards } from '@nestjs/common'
import { AuthUser } from 'src/auth/auth-user.decorator'
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto'
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto'
import { VerifyEmailInput, VerifyEmailOutput } from './dtos/verify-email.dto'

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => CreateAccountOutput)
  async createAccount(
    @Args('input') createAccountInput: CreateAccountInput,
  ): Promise<CreateAccountOutput> {
    try {
      return this.userService.createAccount(createAccountInput)
    } catch (error) {
      return { error, ok: false }
    }
  }

  @Mutation(() => LoginOutput)
  async login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    try {
      return this.userService.login(loginInput)
    } catch (error) {
      return { error, ok: false }
    }
  }

  @Query(() => User)
  @UseGuards(AuthGuard)
  me(@AuthUser() authUser: User) {
    return authUser
  }

  @UseGuards(AuthGuard)
  @Query(() => UserProfileOutput)
  async userProfile(@Args() userProfileInput: UserProfileInput) {
    try {
      const user = await this.userService.findById(userProfileInput.userId)
      if (!user) {
        throw Error()
      }

      return {
        ok: true,
        user,
      }
    } catch (e) {
      return {
        error: 'User Not Found',
        ok: false,
      }
    }
  }

  @UseGuards(AuthGuard)
  @Mutation(() => EditProfileOutput)
  async editProfile(
    @AuthUser() authUser: User,
    @Args('input') editProfileInput: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      return await this.userService.editProfile(authUser.id, editProfileInput)
    } catch (error) {
      return {
        ok: false,
        error,
      }
    }
  }

  @Mutation(() => VerifyEmailOutput)
  async verifyEmail(
    @Args('input') { code }: VerifyEmailInput,
  ): Promise<VerifyEmailOutput> {
    try {
      await this.userService.verifyEmail(code)

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error,
      }
    }
  }
}
