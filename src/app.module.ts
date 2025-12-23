import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as Joi from 'joi'
import { AuthModule } from './auth/auth.module'
import { JwtModule } from './jwt/jwt.module'
import { MailModule } from './mail/mail.module'
import { Category } from './restaurants/entities/category.entity'
import { Dish } from './restaurants/entities/dish.entity'
import { Restaurant } from './restaurants/entities/restaurant.entity'
import { RestaurantsModule } from './restaurants/restaurants.module'
import { User } from './users/entities/user.entity'
import { Verification } from './users/entities/verification.entity'
import { UsersModule } from './users/users.module'
import { OrdersModule } from './orders/orders.module'
import { Order } from './orders/entities/order.entity'
import { OrderItem } from './orders/entities/order-item.entity'
import { CommonModule } from './common/common.module'
import { PaymentsModule } from './payments/payments.module'
import { Payment } from './payments/entities/payment.entity'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env.test',
      ignoreEnvFile: process.env.NODE_ENV === 'prod',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('dev', 'prod', 'test').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.string().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        PRIVATE_KEY: Joi.string().required(),
        MAIL_API_KEY: Joi.string().required(),
        MAIL_DOMAIN_NAME: Joi.string().required(),
        MAIL_FROM_EMAIL: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: process.env.NODE_ENV !== 'prod',
      logging:
        process.env.NODE_ENV !== 'prod' && process.env.NODE_ENV !== 'test',
      entities: [
        User,
        Verification,
        Restaurant,
        Category,
        Dish,
        Order,
        OrderItem,
        Payment,
      ],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      subscriptions: {
        'graphql-ws': true,
      },
      driver: ApolloDriver,
      autoSchemaFile: true,
      graphiql: true,
      context: ({ req, connectionParams, extra }) => {
        return {
          token: req ? req.headers['x-jwt'] : connectionParams['x-jwt'],
        }
      },
    }),
    AuthModule,
    UsersModule,
    RestaurantsModule,
    JwtModule.forRoot({ privateKey: String(process.env.PRIVATE_KEY) }),
    MailModule.forRoot({
      apiKey: String(process.env.MAIL_API_KEY),
      fromEmail: String(process.env.MAIL_FROM_EMAIL),
      domain: String(process.env.MAIL_DOMAIN_NAME),
    }),
    OrdersModule,
    CommonModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
