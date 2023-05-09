import { Server } from "./Server";
import { Request, Response } from "express";
import jwt from 'jsonwebtoken';

export class App {
	server?: Server;

	async start(): Promise<void> {
		const port = process.env.PORT ?? "8000";
		this.server = new Server(port);

		await this.server.listen();
	}
}


