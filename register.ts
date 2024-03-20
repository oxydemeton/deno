import {
  generateRegistrationOptions,
  type GenerateRegistrationOptionsOpts,
  VerifiedRegistrationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

type Authenticator = Pick<
  Exclude<VerifiedRegistrationResponse["registrationInfo"], undefined>,
  | "credentialPublicKey"
  | "credentialID"
  | "counter"
  | "credentialDeviceType"
  | "credentialBackedUp"
>;

async function onOpen(env: {
  socketSend: (content: string) => void | Promise<void>;
  storeRegChallenge: (
    userID: string,
    challenge: string,
    timeout: number,
  ) => void | Promise<void>;
}, config: GenerateRegistrationOptionsOpts): Promise<void> {
  const options = await generateRegistrationOptions(config);
  const timeout = options.timeout || 60 * 1000;
  await env.storeRegChallenge(options.challenge, config.userID, timeout);
  env.socketSend(JSON.stringify(options));
}

async function onMessage(
  env: {
    createUser: (
      userID: string,
      userName: string,
      authenticator: Authenticator,
    ) => void | Promise<void>;
    expectedOrigin: string;
    rpID: string;
  },
  messageData: string,
  userID: string,
  userName: string,
  expectedChallenge: string,
): Promise<void> {
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: JSON.parse(messageData),
      expectedChallenge,
      expectedOrigin: env.expectedOrigin,
      expectedRPID: env.rpID,
    });
  } catch (error) {
    throw error;
  }
  if (verification?.verified) {
    if (!verification.registrationInfo) {
      throw new Error("No registration Info");
    }
    await env.createUser(userID, userName, verification.registrationInfo);
  } else {
    throw new Error("Verification failed");
  }
}

export {
  type Authenticator,
  GenerateRegistrationOptionsOpts,
  onMessage,
  onOpen,
};
