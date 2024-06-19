import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsPositive, IsString, IsUUID, Validate, ValidateNested } from "class-validator";

export type Currency = 'usd' | 'eur' | 'pyg';

export class CreatePaymentSessionDto {
    @IsString()
    @IsIn(['usd', 'eur', 'pyg'])
    currency: Currency;

    @IsString()
    // @IsUUID()
    orderId: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => PaymentSessionItemDto)
    items: PaymentSessionItemDto[];
}

export class PaymentSessionItemDto {
    @IsString()
    name: string;

    @IsNumber()
    @IsPositive()
    price: number

    @IsNumber()
    @IsPositive()
    quantity: number;
}