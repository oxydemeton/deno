import {
  generateRegistrationOptions,
  type GenerateRegistrationOptionsOpts,
  VerifiedRegistrationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

/**Authenticator data to be stored when registering in Database and used in login */
type Authenticator = Pick<
  Exclude<VerifiedRegistrationResponse["registrationInfo"], undefined>,
  | "credentialPublicKey"
  | "credentialID"
  | "counter"
  | "credentialDeviceType"
  | "credentialBackedUp"
>;

/** Function to be called on onopen with a websocket connection to a "@socketauthn" client
 * @param env Contains functions to communicate with the websocket and a function to store a challenge associated to the registration
 * @param config Is the config object to generate the registration options, including the userID and userName, both need to be unique
 */
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
  await env.storeRegChallenge(config.userID, options.challenge, timeout);
  env.socketSend(JSON.stringify(options));
}

/** Function to handle the response to {@link onOpen}.
 * @param env Needs a function to create a user in a db with its {@link Authenticator}, id and name. Also needs data about the service
 * @param messageData is the raw data send as the message by the client
 * @param userID is the id of the user to create
 * @param userName is the unique name oif the user
 * @param expectedChallenge is the {@link Authenticator} object stored in the db when calling {@link onOpen}
 */
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
  type GenerateRegistrationOptionsOpts,
  onMessage,
  onOpen,
};
