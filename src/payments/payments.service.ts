import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICE } from 'src/config';
import Stripe from 'stripe';
import { CreatePaymentSessionDto } from './dto/create-payment-session';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret);
  protected readonly logger = new Logger(PaymentsService.name);

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

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

    const { cancel_url, success_url, url } = session;

    return {
      cancel_url,
      success_url,
      url,
    };
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

        const payload = {
          stripePaymentId: chargeIntentSucceeded.id,
          orderId: chargeIntentSucceeded.metadata.orderId,
          receipmentUrl: chargeIntentSucceeded.receipt_url,
        };

        this.logger.log({ payload });

        this.client.emit('payment.succeeded', payload);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return response.status(200);
  }
}
