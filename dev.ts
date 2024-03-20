import { VerifiedRegistrationResponse } from "@simplewebauthn/server";
import genServeFun from "./mod.ts";

if (import.meta.main) {
    const userDb = await Deno.openKv("./dev.sqlite");
    Deno.serve({ port: 5180 }, genServeFun({
      register_path: "/register",
      login_path: "/login",
      webauthn: {
        rpID: "localhost",
        rpName: "Webauthn with Deno and Websockets",
        attestationType: 'none',
        authenticatorSelection: {
          // Defaults
          residentKey: 'preferred',
          userVerification: 'preferred',
          // Optional
          authenticatorAttachment: 'platform',
        },
      },
      async generateId() {
        let uuid = ""
        do {
          uuid = crypto.randomUUID()
        } while((await userDb.get([uuid])).value)
        return uuid
      },
      async createUser(userID, userName, authenticator) {
        await userDb.set([userID], {userName, authenticator})
        console.log("Stored: ", userID);
        
        return
      },
      async validateUser(userName: string, email: string) {
        return true //TODo add unique by name
      },
      async getUserByName(userName: string) {
        return null //TODO Fix
      },
      websiteOrigin: "http://localhost:5173"
    }))
  }
  