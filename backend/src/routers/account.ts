import { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import authMiddleware from "../middlewares/authMiddleware";
import { Account } from "../db/DB";
import { startSession } from "mongoose";

const logFile = path.join(__dirname, "../../logs/transaction.log");

const router = Router();

/*
  default route -> /api/v1/account
  Account routes -> 
    method       route          body
    GET          /balance
    POST         /transfer      {amount, to}
*/

interface CustomRequest extends Request {
  userId?: string;
}

router.get(
  "/balance",
  authMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const account = await Account.findOne({ userId: req.userId });
      res.json({
        balance: account?.balance,
      });
    } catch (error) {
      fs.appendFileSync(
        logFile,
        `${new Date().toISOString()}\nroute: /balance\n${error}\n`,
      );
      res.status(500).json({
        message: "transaction failed",
      });
    }
  },
);

router.post(
  "/transfer",
  authMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const session = await startSession();
      session.startTransaction();

      const { amount, to } = req.body;

      const account = await Account.findOne({ userId: req.userId });

      if (!account || account.balance < amount) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Insufficient balance",
        });
      }

      const toAccount = await Account.findOne({ userId: to });

      if (!toAccount) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid account",
        });
      }

      // complete the transacton
      await Account.updateOne(
        { userId: req.userId },
        { $inc: { balance: -amount } },
      ).session(session);
      await Account.updateOne(
        { userId: to },
        { $inc: { balance: amount } },
      ).session(session);

      await session.commitTransaction();

      res.json({
        message: "Transfer successful",
      });
    } catch (error) {
      // log the error in log file
      fs.appendFileSync(
        logFile,
        `${new Date().toISOString()}\nroute: /transfer\n${error}\n`,
      );
      res.status(500).json({
        message: "transaction failed",
      });
    }
  },
);

export { router };
