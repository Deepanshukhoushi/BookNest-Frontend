import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WalletService } from '../../core/services/wallet.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.css']
})
export class WalletComponent implements OnInit {
  private authService = inject(AuthService);
  private walletService = inject(WalletService);
  private cartService = inject(CartService);

  loading = signal(false);
  error = signal('');

  wallet = this.walletService.wallet;
  orderAmount = this.cartService.cartTotal;
  insufficientBalance = computed(() => {
    const wallet = this.wallet();
    return !!wallet && wallet.balance < this.orderAmount();
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('Please login to view wallet details.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.walletService.fetchWalletByUserId(user.userId).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load wallet balance');
      }
    });
  }
}
