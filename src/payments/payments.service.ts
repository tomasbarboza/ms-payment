import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { CreatePaymentSessionDto } from './dto/create-payment-session';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret);

  async createPaymentSession(createPaymentSessionDto: CreatePaymentSessionDto) {
    const { currency, items, orderId } = createPaymentSessionDto;

    const lineItems = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          integration_check: 'accept_a_payment',
          orderId: orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.stripeSuccessUrl,
      cancel_url: envs.stripeCancelUrl,
    });

    return session;
  }

  async stripeWeebhookHandler(request: Request, response: Response) {
    const signature = request.headers['stripe-signature'];

    let event: Stripe.Event;
    //testing
    // const endpointSecret = "whsec_61eee6a82a198adddb57d65cf2fbe11a0647e4b2e09418a88f757f6b08bde570";
    //real
    const endpointSecret = envs.stripeEndpointSecret;
    try {
      event = this.stripe.webhooks.constructEvent(
        request['rawBody'],
        signature,
        endpointSecret,
      );
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case 'charge.succeeded':
        //TODO: CAll microservice to update order status
        const chargeIntentSucceeded = event.data.object;
        // Then define and call a function to handle the event payment_intent.succeeded
        console.log({
          metadata: chargeIntentSucceeded.metadata,
        });
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return response.status(200);
  }
}
