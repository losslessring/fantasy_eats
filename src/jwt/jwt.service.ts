import * as jwt from 'jsonwebtoken'
import { Injectable, Inject } from '@nestjs/common'
import { CONFIG_OPTIONS } from './jwt.constants'
import type { JwtModuleOptions } from './jwt.interfaces'

@Injectable()
export class JwtService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: JwtModuleOptions,
  ) {}

  sign(userId: number): string {
    return jwt.sign({ id: userId }, this.options.privateKey)
  }

  verify(token: string) {
    return jwt.verify(token, this.options.privateKey)
  }
}
