import { Injectable, Inject } from '@nestjs/common'
import nodemailer from 'nodemailer'

import { CONFIG_OPTIONS } from 'src/common/common.constants'
import type { EmailVar, MailModuleOptions } from './mail.interfaces'

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  async sendEmail(email: string, code: string) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: this.options.fromEmail,
        pass: this.options.apiKey,
      },
    })
    //;(async () => {
    const info = await transporter.sendMail({
      from: `"Fantasy eats" <${this.options.fromEmail}>`,
      to: email,
      subject: `Your verification code is ${code}`,
      text: `Your verification code is ${code}`,
      html: `<b>Your verification code is ${code}</b>`,
    })
    //})()
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail(email, code)
  }
}
