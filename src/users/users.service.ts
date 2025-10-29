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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
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
      await this.verifications.save(this.verifications.create({ user }))

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
        error,
      }
    }
  }

  async findById(id: number): Promise<User | null> {
    return this.users.findOneBy({ id })
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<{ ok: boolean; error?: string }> {
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
      await this.verifications.save(this.verifications.create({ user }))
    }

    if (password) {
      user.password = password
    }

    this.users.save(user)
    return { ok: true }
  }

  async verifyEmail(code: string): Promise<boolean> {
    try {
      const verification = await this.verifications.findOne({
        where: { code },
        relations: ['user'],
      })

      if (verification) {
        verification.user.verified = true
        await this.users.save(verification.user)
        await this.verifications.delete(verification.id)
        return true
      }

      throw new Error()
    } catch (e) {
      console.log(e)
      return false
    }
  }
}
