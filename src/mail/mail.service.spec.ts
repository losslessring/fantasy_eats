import { Test } from '@nestjs/testing'
import { CONFIG_OPTIONS } from 'src/common/common.constants'
import { MailService } from './mail.service'

const EMAIL = 'test@test.com'
const VERIFICATION_CODE = '12345'

describe('MailService', () => {
  let service: MailService
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: 'test-apiKey',
            domain: 'test-domain',
            fromEmail: 'test-fromEmail',
          },
        },
      ],
    }).compile()

    service = module.get<MailService>(MailService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should call sendEmail', () => {
    jest.spyOn(service, 'sendEmail').mockImplementation(async () => {})

    service.sendVerificationEmail(EMAIL, VERIFICATION_CODE)

    expect(service.sendEmail).toHaveBeenCalledTimes(1)
    expect(service.sendEmail).toHaveBeenCalledWith(EMAIL, VERIFICATION_CODE)
  })
})
