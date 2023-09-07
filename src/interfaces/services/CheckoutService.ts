import { Customer, Order, PrismaClient } from "@prisma/client";

import { CustomerData } from "../CustomerData";
import { PaymentData } from "../PaymentData";
import { SnackData } from "../SnackData";

export default class CheckoutService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async process(
    cart: SnackData[],
    customer: CustomerData,
    payment: PaymentData
  ) {
    //pegar todos os dados de snack no BD
    const snacks = await this.prisma.snack.findMany({
      where: {
        id: {
          in: cart.map((snack) => snack.id),
        },
      },
    });
    // console.log("snacks", snacks);

    const snacksInCart = snacks.map<SnackData>((snack) => ({
      ...snack,
      price: Number(snack.price),
      quantity: cart.find((item) => item.id === snack.id)?.quantity!,
      subtotal:
        cart.find((item) => item.id === snack.id)?.quantity! *
        Number(snack.price),
    }));
    //console.log("snacksInCart", snacksInCart);

    //registrar os dados do cliente no BD
    const customerCreated = await this.createCustomer(customer);
    //console.log("customerCreated", customerCreated);

    //criar uma order orderitem
    const orderCreated = await this.createOrder(snacksInCart, customerCreated);
    console.log("orderCreated", orderCreated);
  }

  private async createCustomer(customer: CustomerData): Promise<Customer> {
    const customerCreated = await this.prisma.customer.upsert({
      where: { email: customer.email },
      update: customer,
      create: customer,
    });

    return customerCreated;
  }

  private async createOrder(
    snacksInCart: SnackData[],
    customer: Customer
  ): Promise<Order> {
    const total = snacksInCart.reduce((acc, snack) => acc + snack.subtotal, 0);

    const orderCreated = await this.prisma.order.create({
      data: {
        total,
        customer: {
          connect: { id: customer.id },
        },
        orderItems: {
          createMany: {
            data: snacksInCart.map((snack) => ({
              snackId: snack.id,
              quantity: snack.quantity,
              subTotal: snack.subtotal,
            })),
          },
        },
      },
      include: {
        customer: true,
        orderItems: { include: { snack: true } },
      },
    });

    return orderCreated;
  }
}
