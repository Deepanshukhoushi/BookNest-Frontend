import { environment } from '../../../environments/environment';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs';
import { ApiResponse, Wallet, Statement } from '../../shared/models/models';

type WalletApiResponse = {
  walletId: number;
  userId: number;
  currentBalance: number;
};

/**
 * Service responsible for managing the user's digital wallet and transaction history.
 * Provides methods for checking balance, adding funds, and making payments.
 */
@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiBaseUrl + '/wallet';

  private walletSignal = signal<Wallet | null>(null);
  wallet = this.walletSignal.asReadonly();

  // Retrieves the current wallet balance and ID for a given user
  fetchWalletByUserId(userId: number) {
    return this.http.get<ApiResponse<WalletApiResponse>>(`${this.API_URL}/user/${userId}`).pipe(
      map((response) => ({
        walletId: response.data.walletId,
        userId: response.data.userId,
        balance: response.data.currentBalance
      })),
      tap((wallet) => this.walletSignal.set(wallet))
    );
  }

  // Adds a specified amount of funds to the user's wallet
  addMoney(userId: number, walletId: number, amount: number, paymentGateway: string = 'card') {
    return this.http.post<ApiResponse<WalletApiResponse>>(`${this.API_URL}/addMoney`, { userId, walletId, amount, paymentGateway }).pipe(
      map((response) => ({
        walletId: response.data.walletId,
        userId: response.data.userId,
        balance: response.data.currentBalance
      })),
      tap((wallet) => this.walletSignal.set(wallet))
    );
  }

  // Deducts a specified amount from the wallet for a purchase
  pay(walletId: number, amount: number, orderId: number = 0) {
    return this.http.post<ApiResponse<WalletApiResponse>>(`${this.API_URL}/pay`, { walletId, amount, orderId }).pipe(
      map((response) => ({
        walletId: response.data.walletId,
        userId: response.data.userId,
        balance: response.data.currentBalance
      })),
      tap((wallet) => this.walletSignal.set(wallet))
    );
  }

  // Retrieves all transaction statements and history for a given wallet
  getStatements(walletId: number) {
    return this.http.get<ApiResponse<Statement[]>>(`${this.API_URL}/statements/${walletId}`).pipe(
      map(response => response.data)
    );
  }

  // Initiates a Razorpay payment order for wallet top-up
  initiateRazorpayTopUp(userId: number, walletId: number, amount: number) {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/initiate-razorpay`, { userId, walletId, amount }).pipe(
      map(response => response.data)
    );
  }

  // Verifies a Razorpay payment and updates the wallet balance
  verifyRazorpayTopUp(verificationData: Record<string, unknown>) {
    return this.http.post<ApiResponse<WalletApiResponse>>(`${this.API_URL}/verify-razorpay`, verificationData).pipe(
      map((response) => ({
        walletId: response.data.walletId,
        userId: response.data.userId,
        balance: response.data.currentBalance
      })),
      tap((wallet) => this.walletSignal.set(wallet))
    );
  }

  // Retrieves the Razorpay public key from the backend
  getRazorpayPublicKey() {
    return this.http.get<ApiResponse<string>>(`${this.API_URL}/razorpay-key`).pipe(
      map(response => response.data)
    );
  }
}
