export interface VerificationSender {
  sendEmailCode(input: { email: string; role: "patient" | "doctor"; code: string }): Promise<void>;
  sendSmsCode(input: {
    phoneCountryCode: string;
    phone: string;
    role: "patient" | "doctor";
    code: string;
  }): Promise<void>;
}

export class ConsoleVerificationSender implements VerificationSender {
  async sendEmailCode(input: {
    email: string;
    role: "patient" | "doctor";
    code: string;
  }): Promise<void> {
    console.info(`[auth] email verification for ${input.role} ${input.email}: ${input.code}`);
  }

  async sendSmsCode(input: {
    phoneCountryCode: string;
    phone: string;
    role: "patient" | "doctor";
    code: string;
  }): Promise<void> {
    console.info(
      `[auth] sms verification for ${input.role} ${input.phoneCountryCode}${input.phone}: ${input.code}`
    );
  }
}
