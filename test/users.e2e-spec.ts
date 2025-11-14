import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'
import { DataSource } from 'typeorm'

jest.mock('nodemailer', () => {
  return {
    createTransport: () => {
      return { sendMail: jest.fn() }
    },
  }
})

const GRAPHQL_ENDPOINT = '/graphql'

const testUser = {
  email: 'test_email_0@gmail.com',
  password: '12345',
}
//const EMAIL = 'test_email_0@gmail.com'
//const PASSWORD = '12345'

describe('UserModule (e2e)', () => {
  let app: INestApplication<App>
  let jwtToken: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    const dataSource = app.get(DataSource)
    if (dataSource) {
      await dataSource.dropDatabase()
    }
    await app.close()
  })
  describe('createAccount', () => {
    const createAccountQuery = `mutation {
      createAccount(input: {
        email: "${testUser.email}",
        password: "${testUser.password}",
        role: Client
      }) {
        ok
        error
      }
    }
    `

    const correctLoginQuery = `mutation {
      login(input: {
        email: "${testUser.email}",
        password: "${testUser.password}",
      }) {
        ok
        error
        token
      }
    }
    `

    const wrongLoginQuery = `mutation {
      login(input: {
        email: "${testUser.email}",
        password: "123",
      }) {
        ok
        error
        token
      }
    }
    `

    it('should create account', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: createAccountQuery,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true)
          expect(res.body.data.createAccount.error).toBe(null)
        })
    })

    it('should fail if account already exists', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: createAccountQuery,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false)
          expect(res.body.data.createAccount.error).toEqual(expect.any(String))
        })
    })

    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: correctLoginQuery,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res
          expect(login.ok).toBe(true)
          expect(login.error).toBe(null)
          expect(login.token).toEqual(expect.any(String))
          jwtToken = login.token
        })
    })

    it('should not be able to login with wrong credentials', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: wrongLoginQuery,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res
          expect(login.ok).toBe(false)
          expect(login.error).toBe('Wrong password')
        })
    })
  })
})
