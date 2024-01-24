import { Decimal128, ObjectId, Schema, model, connect } from "mongoose";

connect("mongodb://localhost:27017/paytm")
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error", err));

export interface IUser {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avtar?: string;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minLength: 3,
    maxLength: 30,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
  avtar: {
    type: String,
  },
});

export interface IAccount {
  userId: ObjectId;
  balance: Decimal128;
}

const accountSchema = new Schema<IAccount>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: {
    type: Schema.Types.Decimal128,
    required: true,
  },
});

const User = model<IUser>("User", userSchema);
const Account = model<IAccount>("Account", accountSchema);

export { User, Account };
