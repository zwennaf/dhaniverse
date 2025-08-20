import { AuthClient } from "@dfinity/auth-client";
import { Actor, HttpAgent } from "@dfinity/agent";

export class AuthService {
    private authClient: AuthClient | null = null;
    private actor: any = null;

    async init() {
        this.authClient = await AuthClient.create();

        if (await this.authClient.isAuthenticated()) {
            await this.setupActor();
        }
    }

    async login() {
        if (!this.authClient) {
            await this.init();
        }

        return new Promise<void>((resolve, reject) => {
            this.authClient!.login({
                identityProvider: "https://identity.ic0.app",
                onSuccess: async () => {
                    await this.setupActor();
                    resolve();
                },
                onError: reject,
            });
        });
    }

    async logout() {
        if (this.authClient) {
            await this.authClient.logout();
            this.actor = null;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        if (!this.authClient) {
            await this.init();
        }
        return this.authClient!.isAuthenticated();
    }

    async getPrincipal() {
        if (!this.authClient) {
            await this.init();
        }
        const identity = this.authClient!.getIdentity();
        return identity.getPrincipal().toString();
    }

    private async setupActor() {
        if (!this.authClient) return;

        const identity = this.authClient.getIdentity();
        const agent = new HttpAgent({
            identity,
            host: "https://ic0.app",
        });

        // In production, you should fetch this from your canister
        // For now, we'll create a basic actor
        // You'll need to import your canister's IDL here
        // this.actor = Actor.createActor(idlFactory, {
        //   agent,
        //   canisterId: 'dzbzg-eqaaa-aaaap-an3rq-cai',
        // });
    }

    getActor() {
        return this.actor;
    }
}

export const authService = new AuthService();
