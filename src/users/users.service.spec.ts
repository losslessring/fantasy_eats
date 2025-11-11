import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { JwtService } from 'src/jwt/jwt.service'
import { MailService } from 'src/mail/mail.service'
import { ObjectLiteral, Repository, ServerCapabilities } from 'typeorm'
import { User } from './entities/user.entity'
import { Verification } from './entities/verification.entity'
import { UserService } from './users.service'

const mockRepository = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  findOneByOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
})

const mockJwtService = () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
})

const mockMailService = () => ({
  sendVerificationEmail: jest.fn(),
})

type MockRepository<T = any> = Partial<Record<keyof Repository<any>, jest.Mock>>

describe('UserService', () => {
  let service: UserService
  // let usersRepository: Partial<Record<keyof Repository<User>, jest.Mock>>
  let usersRepository: MockRepository<User>
  let verificationsRepository: MockRepository<Verification>
  let mailService: MailService
  let jwtService: JwtService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
    usersRepository = module.get(getRepositoryToken(User))
    verificationsRepository = module.get(getRepositoryToken(Verification))
    mailService = module.get<MailService>(MailService)
    jwtService = module.get<JwtService>(JwtService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createAccount', () => {
    const createAccountArgs = {
      email: '',
      password: '',
      role: 0,
    }
    it('should fail if user exists', async () => {
      usersRepository.findOneBy?.mockResolvedValue({
        id: 1,
        email: 'mock_email_0@mock.com',
      })

      const result = await service.createAccount(createAccountArgs)

      expect(result).toMatchObject({
        ok: false,
        error: 'There is a user with this email already',
      })
    })

    it('should create a new user', async () => {
      usersRepository.findOneBy?.mockResolvedValue(undefined)
      usersRepository.create?.mockReturnValue(createAccountArgs)
      usersRepository.save?.mockResolvedValue(createAccountArgs)

      verificationsRepository.create?.mockReturnValue({
        user: createAccountArgs,
      })
      verificationsRepository.save?.mockResolvedValue({ code: 'code' })

      const result = await service.createAccount(createAccountArgs)

      expect(usersRepository.create).toHaveBeenCalledTimes(1)
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs)

      expect(usersRepository.save).toHaveBeenCalledTimes(1)
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs)

      expect(verificationsRepository.create).toHaveBeenCalledTimes(1)
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      })

      expect(verificationsRepository.save).toHaveBeenCalledTimes(1)
      expect(verificationsRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs,
      })

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1)
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      )

      expect(result).toEqual({ ok: true })
    })

    it('should fail on exception', async () => {
      usersRepository.findOneBy?.mockRejectedValue(new Error())
      const result = await service.createAccount(createAccountArgs)
      expect(result).toEqual({
        ok: false,
        error: 'Could not create an account',
      })
    })
  })

  describe('login', () => {
    const loginArgs = {
      email: 'test@test.com',
      password: 'test',
    }
    it('should fail if user does not exist', async () => {
      usersRepository.findOne?.mockResolvedValue(null)
      const result = await service.login(loginArgs)

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1)
      expect(usersRepository.findOne).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      }

      usersRepository.findOne?.mockResolvedValue(mockedUser)
      const result = await service.login(loginArgs)

      expect(result).toEqual({ ok: false, error: 'Wrong password' })
    })

    it('should return token if the password is correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      }

      usersRepository.findOne?.mockResolvedValue(mockedUser)
      const result = await service.login(loginArgs)

      expect(jwtService.sign).toHaveBeenCalledTimes(1)
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number))
      expect(result).toEqual({ ok: true, token: 'signed-token' })
    })

    it('should fail on exception', async () => {
      usersRepository.findOne?.mockRejectedValue(new Error())
      const result = await service.login(loginArgs)
      expect(result).toEqual({ ok: false, error: 'Can not login user' })
    })
  })
  describe('findById', () => {
    const findByIdArgs = { id: 1 }

    it('should find an existing user', async () => {
      usersRepository.findOneByOrFail?.mockResolvedValue(findByIdArgs)
      const result = await service.findById(1)
      expect(result).toEqual({ ok: true, user: findByIdArgs })
    })

    it('should fail if no user is found', async () => {
      usersRepository.findOneByOrFail?.mockRejectedValue(new Error())
      const result = await service.findById(1)
      expect(result).toEqual({ ok: false, error: 'User not found' })
    })
  })

  describe('editProfile', () => {
    const findByIdArgs = { id: 1 }

    it('should change email', async () => {
      const oldUser = {
        email: 'email@old.com',
        verified: true,
      }

      const editProfileArgs = {
        userId: 1,
        input: { email: 'email@new.com' },
      }
      const newVerification = { code: 'code' }

      const newUser = {
        id: 1,
        verified: false,
        email: editProfileArgs.input.email,
      }

      usersRepository.findOneBy?.mockResolvedValue({
        id: editProfileArgs.userId,
      })

      verificationsRepository.create?.mockReturnValue(newVerification)
      verificationsRepository.save?.mockReturnValue(newVerification)

      await service.editProfile(editProfileArgs.userId, editProfileArgs.input)

      expect(usersRepository.findOneBy).toHaveBeenCalledTimes(1)
      expect(usersRepository.findOneBy).toHaveBeenCalledWith({
        id: editProfileArgs.userId,
      })

      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: newUser,
      })
      expect(verificationsRepository.save).toHaveBeenCalledWith(newVerification)

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1)
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUser.email,
        newVerification.code,
      )
    })

    it('should change password', async () => {
      const editProfileArgs = {
        userId: 1,
        input: { password: 'new_password' },
      }
      usersRepository.findOneBy?.mockResolvedValue({
        password: 'old',
      })
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      )
      expect(usersRepository.save).toHaveBeenCalledTimes(1)
      expect(usersRepository.save).toHaveBeenCalledWith(editProfileArgs.input)
      expect(result).toEqual({ ok: true })
    })

    it('should fail if user not found', async () => {
      usersRepository.findOneBy?.mockResolvedValue(undefined)
      const result = await service.editProfile(1, { email: '12' })
      expect(result).toEqual({ ok: false, error: 'User not found' })
    })

    it('should fail on exception', async () => {
      usersRepository.findOneBy?.mockRejectedValue(new Error())
      const result = await service.editProfile(1, { email: '12' })
      expect(result).toEqual({ ok: false, error: 'Could not update profile' })
    })
  })
  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const mockedVerification = {
        user: {
          verified: false,
        },
        id: 1,
      }
      verificationsRepository.findOne?.mockResolvedValue(mockedVerification)

      const result = await service.verifyEmail('')

      expect(verificationsRepository.findOne).toHaveBeenCalledTimes(1)
      expect(verificationsRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
      )

      expect(usersRepository.save).toHaveBeenCalledTimes(1)
      expect(usersRepository.save).toHaveBeenCalledWith({ verified: true })

      expect(verificationsRepository.delete).toHaveBeenCalledTimes(1)
      expect(verificationsRepository.delete).toHaveBeenCalledWith(
        mockedVerification.id,
      )

      expect(result).toEqual({ ok: true })
    })

    it('should fail on verification not found', async () => {
      verificationsRepository.findOne?.mockResolvedValue(undefined)
      const result = await service.verifyEmail('')
      expect(result).toEqual({ ok: false, error: 'Verification not found' })
    })

    it('should fail on exception', async () => {
      verificationsRepository.findOne?.mockRejectedValue(new Error())
      const result = await service.verifyEmail('')
      expect(result).toEqual({ ok: false, error: 'Could not verify email' })
    })
  })
})
