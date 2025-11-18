import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'
import { DataSource, Repository } from 'typeorm'
import { User } from 'src/users/entities/user.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Verification } from 'src/users/entities/verification.entity'

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
  let usersRepository: Repository<User>
  let verificationsRepository: Repository<Verification>
  let jwtToken: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User))
    verificationsRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    )
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

  describe('userProfile', () => {
    let userId: number

    beforeAll(async () => {
      const [user] = await usersRepository.find()
      userId = user.id
    })

    it('should see a users profile', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
        {
          userProfile(userId:${userId}){
            ok
            error
            user {
              id
            }
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { id },
                },
              },
            },
          } = res

          expect(ok).toBe(true)
          expect(error).toBe(null)
          expect(id).toBe(userId)
        })
    })

    it('should see a users profile', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
      {
        userProfile(userId:111){
          ok
          error
          user {
            id
          }
        }
      }
      `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res

          expect(ok).toBe(false)
          expect(error).toBe('User not found')
          expect(user).toBe(null)
        })
    })
  })

  describe('me', () => {
    it('should see a users profile', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
        {
          me {
            email
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res

          expect(email).toBe(testUser.email)
        })
    })

    it('should return error if user is not logged in', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
        {
          me {
            email
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res

          const [error] = errors

          expect(error.message).toBe('Forbidden resource')
        })
    })
  })

  describe('editProfile', () => {
    const NEW_EMAIL = 'test_email1@test.com'
    it('should change email', async () => {
      await request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
        mutation {
          editProfile(input: {
            email:"${NEW_EMAIL}"
          }) {
            ok
            error
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res

          expect(ok).toBe(true)
          expect(error).toBe(null)
        })
    })

    it('should be changed email', async () => {
      await request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
        {
          me {
            email
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res

          expect(email).toBe(NEW_EMAIL)
        })
    })
  })

  describe('verifyEmail', () => {
    let verificationCode: string
    beforeAll(async () => {
      const [verification] = await verificationsRepository.find()
      verificationCode = verification.code
    })

    it('should verify email', async () => {
      await request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
      mutation {
        verifyEmail(input: {
          code:"${verificationCode}"
        }) {
          ok
          error
        }
      }
      `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res

          expect(ok).toBe(true)
          expect(error).toBe(null)
        })
    })

    it('should fail on wrong verification code', async () => {
      await request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
      mutation {
        verifyEmail(input: {
          code:"12345777"
        }) {
          ok
          error
        }
      }
      `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res

          expect(ok).toBe(false)
          expect(error).toBe('Verification not found')
        })
    })
  })
})
