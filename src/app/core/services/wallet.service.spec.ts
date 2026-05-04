import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WalletService } from './wallet.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/models';

describe('WalletService', () => {
  let service: WalletService;
  let httpMock: HttpTestingController;

  const mockWalletResponse = {
    walletId: 1,
    userId: 101,
    currentBalance: 500
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WalletService]
    });
    service = TestBed.inject(WalletService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch wallet by user id', () => {
    const response: ApiResponse<any> = { success: true, message: 'Success', data: mockWalletResponse };
    
    service.fetchWalletByUserId(101).subscribe(wallet => {
      expect(wallet.balance).toBe(500);
      expect(wallet.walletId).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/wallet/user/101`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('should add money to wallet', () => {
    const response: ApiResponse<any> = { success: true, message: 'Success', data: { ...mockWalletResponse, currentBalance: 1000 } };

    service.addMoney(101, 1, 500).subscribe(wallet => {
      expect(wallet.balance).toBe(1000);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/wallet/addMoney`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 101, walletId: 1, amount: 500, paymentGateway: 'card' });
    req.flush(response);
  });

  it('should pay from wallet', () => {
    const response: ApiResponse<any> = { success: true, message: 'Success', data: { ...mockWalletResponse, currentBalance: 400 } };

    service.pay(1, 100, 505).subscribe(wallet => {
      expect(wallet.balance).toBe(400);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/wallet/pay`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ walletId: 1, amount: 100, orderId: 505 });
    req.flush(response);
  });

  it('should get statements', () => {
    const mockStatements = [{ statementId: 1, amount: 100, type: 'DEBIT', transactionDate: new Date().toISOString() }];
    const response: ApiResponse<any[]> = { success: true, message: 'Success', data: mockStatements };

    service.getStatements(1).subscribe(statements => {
      expect(statements.length).toBe(1);
      expect(statements[0].statementId).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/wallet/statements/1`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
