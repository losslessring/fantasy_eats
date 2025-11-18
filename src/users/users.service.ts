import * as jwt from 'jsonwebtoken'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'
import { Injectable } from '@nestjs/common'
import { CreateAccountInput } from './dtos/create-account.dto'
import { LoginInput } from './dtos/login.dto'
import { JwtService } from 'src/jwt/jwt.service'
import { ConfigService } from '@nestjs/config'
import { EditProfileInput } from './dtos/edit-profile.dto'
import { Verification } from './entities/verification.entity'
import { MailService } from 'src/mail/mail.service'
import { UserProfileOutput } from './dtos/user-profile.dto'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<{ ok: boolean; error?: string }> {
    try {
      const exists = await this.users.findOneBy({ email })
      if (exists) {
        return { ok: false, error: 'There is a user with this email already' }
      }

      const user = await this.users.save(
        this.users.create({ email, password, role }),
      )
      const verification = await this.verifications.save(
        this.verifications.create({ user }),
      )

      this.mailService.sendVerificationEmail(user.email, verification.code)

      return { ok: true }
    } catch (e) {
      return { ok: false, error: 'Could not create an account' }
    }
  }

  async login({
    email,
    password,
  }: LoginInput): Promise<{ ok: boolean; error?: string; token?: string }> {
    try {
      const user = await this.users.findOne({
        where: { email },
        select: ['id', 'password'],
      })
      if (!user) {
        return {
          ok: false,
          error: 'User not found',
        }
      }

      const passwordCorrect = await user.checkPassword(password)

      if (!passwordCorrect) {
        return {
          ok: false,
          error: 'Wrong password',
        }
      }

      const token = this.jwtService.sign(user.id)

      return {
        ok: true,
        token,
      }
    } catch (error) {
      return {
        ok: false,
        error: 'Can not login user',
      }
    }
  }

  async findById(id: number): Promise<User | null> {
    //return this.users.findOneBy({ id })
    // try {
    return this.users.findOneBy({ id })
    // const user = await this.users.findOneByOrFail({ id })
    // console.log(user)
    // return { ok: true, user }
    // } catch (error) {
    //   return { ok: false, error: 'User not found' }
    // }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const user = await this.users.findOneBy({ id: userId })

      if (!user) {
        return {
          ok: false,
          error: 'User not found',
        }
      }

      if (email) {
        user.email = email
        user.verified = false
        await this.verifications.delete({ user: { id: user.id } })
        const verification = await this.verifications.save(
          this.verifications.create({ user }),
        )
        this.mailService.sendVerificationEmail(user.email, verification.code)
      }

      if (password) {
        user.password = password
      }

      this.users.save(user)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: 'Could not update profile' }
    }
  }

  async verifyEmail(code: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const verification = await this.verifications.findOne({
        where: { code },
        relations: ['user'],
      })

      if (verification) {
        verification.user.verified = true
        await this.users.save(verification.user)
        await this.verifications.delete(verification.id)
        return { ok: true }
      }

      return { ok: false, error: 'Verification not found' }
    } catch (error) {
      return { ok: false, error: 'Could not verify email' }
    }
  }
}
