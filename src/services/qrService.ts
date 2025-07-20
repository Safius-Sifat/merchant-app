import QRCode from 'qrcode';
import { QRPaymentData } from '../types';

export class QRCodeService {
    // USDT contract addresses for different chains
    private static readonly USDT_CONTRACTS = {
        1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet
        137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
        56: '0x55d398326f99059fF775485246999027B3197955', // BSC
    };

    /**
     * Generate ERC-681 payment link
     */
    static generateERC681Link(
        merchantAddress: string,
        amount: number,
        tokenAddress?: string,
        chainId: number = 1
    ): string {
        if (tokenAddress) {
            // ERC-20 token transfer
            return `ethereum:${tokenAddress}/transfer?address=${merchantAddress}&uint256=${amount}`;
        } else {
            // Native ETH transfer
            return `ethereum:${merchantAddress}?value=${amount}`;
        }
    }

    /**
     * Create USDT payment QR code
     */
    static async createUSDTPaymentQR(
        merchantAddress: string,
        amount: number,
        chainId: number = 1
    ): Promise<QRPaymentData> {
        const usdtAddress = this.USDT_CONTRACTS[chainId as keyof typeof this.USDT_CONTRACTS];

        if (!usdtAddress) {
            throw new Error(`USDT not supported on chain ${chainId}`);
        }

        // Convert amount to smallest unit (USDT has 6 decimals)
        const amountInWei = Math.floor(amount * 1000000).toString();

        const erc681Link = this.generateERC681Link(
            merchantAddress,
            parseInt(amountInWei),
            usdtAddress,
            chainId
        );

        return {
            merchantAddress,
            amount,
            tokenAddress: usdtAddress,
            tokenSymbol: 'USDT',
            chainId,
            erc681Link
        };
    }

    /**
     * Generate QR code image from payment data
     */
    static async generateQRCodeImage(paymentData: QRPaymentData): Promise<string> {
        try {
            const qrCodeDataURL = await QRCode.toDataURL(paymentData.erc681Link, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrCodeDataURL;
        } catch (error) {
            throw new Error(`Failed to generate QR code: ${error}`);
        }
    }

    /**
     * Create complete payment QR with image
     */
    static async createPaymentQR(
        merchantAddress: string,
        amount: number,
        tokenSymbol: string = 'USDT',
        chainId: number = 1
    ): Promise<{ paymentData: QRPaymentData; qrImage: string }> {
        let paymentData: QRPaymentData;

        if (tokenSymbol.toLowerCase() === 'usdt') {
            paymentData = await this.createUSDTPaymentQR(merchantAddress, amount, chainId);
        } else {
            // Handle other tokens or native currency
            const erc681Link = this.generateERC681Link(merchantAddress, amount);
            paymentData = {
                merchantAddress,
                amount,
                chainId,
                erc681Link
            };
        }

        const qrImage = await this.generateQRCodeImage(paymentData);

        return { paymentData, qrImage };
    }
}
