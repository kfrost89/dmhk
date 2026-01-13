// Prisberegner for Den Mobile Høreklinik
// UX-optimeret version

const PRICES = {
    twoDevices: { basis: 14999, plus: 18999, premium: 22999 },
    oneDevice: { basis: 7999, plus: 9999, premium: 11999 },
    rechargeable: 750
};

const SUBSIDIES = {
    public: { oneDevice: 4458, twoDevices: 6888 },
    insurance: { 'group1-2': 1500, 'group5': 1000, 'basis': 500 },
    seniorDiscount: 750
};

class PriceCalculator {
    constructor() {
        this.state = {
            quantity: 2,
            tier: 'premium',
            publicSubsidy: true,
            healthInsurance: false,
            insuranceGroup: 'group1-2',
            seniorDiscount: false,
            healthSupplement: false,
            supplementPercent: 85,
            rechargeable: true
        };
        this.init();
    }

    init() {
        this.syncStateWithDOM();
        this.bindEvents();
        this.calculate();
        this.initToggles();
    }

    syncStateWithDOM() {
        // Synkroniser state med checkbox-værdier i DOM
        this.state.publicSubsidy = document.getElementById('publicSubsidy').checked;
        this.state.healthInsurance = document.getElementById('healthInsurance').checked;
        this.state.seniorDiscount = document.getElementById('seniorDiscount').checked;
        this.state.healthSupplement = document.getElementById('healthSupplement').checked;
        this.state.rechargeable = document.getElementById('rechargeable').checked;

        // Synkroniser aktiv tier
        const activeTier = document.querySelector('.price-tier.active');
        if (activeTier) {
            this.state.tier = activeTier.dataset.value;
        }

        // Synkroniser quantity
        const activeQty = document.querySelector('[data-field="quantity"] .btn-option.active');
        if (activeQty) {
            this.state.quantity = parseInt(activeQty.dataset.value);
        }
    }

    bindEvents() {
        // Antal høreapparater
        document.querySelectorAll('[data-field="quantity"] .btn-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                document.querySelectorAll('[data-field="quantity"] .btn-option').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                this.state.quantity = parseInt(button.dataset.value);
                this.updateTierPrices();
                this.calculate();
            });
        });

        // Prisklasse
        document.querySelectorAll('.price-tier').forEach(tier => {
            tier.addEventListener('click', () => {
                document.querySelectorAll('.price-tier').forEach(t => t.classList.remove('active'));
                tier.classList.add('active');
                this.state.tier = tier.dataset.value;
                this.calculate();
            });
        });

        // Offentligt tilskud
        document.getElementById('publicSubsidy').addEventListener('change', (e) => {
            this.state.publicSubsidy = e.target.checked;
            document.getElementById('publicSubsidyCard').classList.toggle('active', e.target.checked);
            this.calculate();
        });

        // Sygeforsikring
        document.getElementById('healthInsurance').addEventListener('change', (e) => {
            this.state.healthInsurance = e.target.checked;
            document.getElementById('insuranceCard').classList.toggle('active', e.target.checked);
            document.getElementById('insuranceOptions').classList.toggle('visible', e.target.checked);
            this.calculate();
        });

        document.getElementById('insuranceGroup').addEventListener('change', (e) => {
            this.state.insuranceGroup = e.target.value;
            this.calculate();
        });

        // Ældre Sagen
        document.getElementById('seniorDiscount').addEventListener('change', (e) => {
            this.state.seniorDiscount = e.target.checked;
            document.getElementById('seniorCard').classList.toggle('active', e.target.checked);
            this.calculate();
        });

        // Helbredstillæg
        document.getElementById('healthSupplement').addEventListener('change', (e) => {
            this.state.healthSupplement = e.target.checked;
            document.getElementById('supplementCard').classList.toggle('active', e.target.checked);
            document.getElementById('supplementOptions').classList.toggle('visible', e.target.checked);
            this.calculate();
        });

        document.getElementById('supplementPercent').addEventListener('input', (e) => {
            this.state.supplementPercent = parseInt(e.target.value) || 0;
            document.getElementById('supplementPercentValue').textContent = this.state.supplementPercent + '%';
            this.calculate();
        });

        // Genopladelige
        document.getElementById('rechargeable').addEventListener('change', (e) => {
            this.state.rechargeable = e.target.checked;
            document.getElementById('rechargeableCard').classList.toggle('active', e.target.checked);
            this.calculate();
        });
    }

    initToggles() {
        // Details toggle
        const detailsToggle = document.getElementById('detailsToggle');
        const detailsContent = document.getElementById('detailsContent');

        detailsToggle.addEventListener('click', () => {
            detailsContent.classList.toggle('visible');
            detailsToggle.classList.toggle('open');
        });
    }

    updateTierPrices() {
        const priceTable = this.state.quantity === 2 ? PRICES.twoDevices : PRICES.oneDevice;
        document.querySelectorAll('.tier-price').forEach(el => {
            const tier = el.dataset.tier;
            el.textContent = this.formatPrice(priceTable[tier]);
        });
    }

    calculate() {
        const { quantity, tier, publicSubsidy, healthInsurance, insuranceGroup,
                seniorDiscount, healthSupplement, supplementPercent, rechargeable } = this.state;

        // Basispris
        const priceTable = quantity === 2 ? PRICES.twoDevices : PRICES.oneDevice;
        const basePrice = priceTable[tier];
        const rechargeablePrice = rechargeable ? (PRICES.rechargeable * quantity) : 0;
        const totalBeforeSubsidies = basePrice + rechargeablePrice;

        // 1. Ældre Sagen rabat (forhandlerrabat, fratrækkes fra prisen)
        const seniorAmount = seniorDiscount ? (SUBSIDIES.seniorDiscount * quantity) : 0;
        const priceAfterDiscount = Math.max(0, totalBeforeSubsidies - seniorAmount);

        // 2. Offentligt tilskud
        const publicAmount = publicSubsidy ? (quantity === 2 ? SUBSIDIES.public.twoDevices : SUBSIDIES.public.oneDevice) : 0;
        const afterPublicSubsidy = Math.max(0, priceAfterDiscount - publicAmount);

        // 3. Sygeforsikring (50% af egenbetaling efter offentligt tilskud, max pr. øre)
        let insuranceAmount = 0;
        if (healthInsurance) {
            const maxPerEar = SUBSIDIES.insurance[insuranceGroup];
            const maxTotal = maxPerEar * quantity;
            insuranceAmount = Math.min(Math.round(afterPublicSubsidy * 0.5), maxTotal);
        }
        const afterInsurance = Math.max(0, afterPublicSubsidy - insuranceAmount);

        // 4. Helbredstillæg (% af resterende egenbetaling)
        const supplementAmount = healthSupplement ? Math.round(afterInsurance * (supplementPercent / 100)) : 0;
        const finalPrice = Math.max(0, afterInsurance - supplementAmount);

        const totalSavings = totalBeforeSubsidies - finalPrice;
        const savingsPercent = totalBeforeSubsidies > 0 ? Math.round((totalSavings / totalBeforeSubsidies) * 100) : 0;

        this.updateUI({
            basePrice,
            rechargeablePrice,
            rechargeable,
            publicSubsidy,
            publicAmount,
            healthInsurance,
            insuranceAmount,
            seniorDiscount,
            seniorAmount,
            healthSupplement,
            supplementPercent,
            supplementAmount,
            totalBeforeSubsidies,
            finalPrice,
            totalSavings,
            savingsPercent
        });
    }

    updateUI(v) {
        // Subsidy card amounts
        document.getElementById('publicSubsidyDisplay').textContent = '-' + this.formatPrice(v.publicAmount);
        document.getElementById('insuranceDisplay').textContent = '-' + this.formatPrice(v.insuranceAmount);
        document.getElementById('seniorDisplay').textContent = '-' + this.formatPrice(v.seniorAmount);
        document.getElementById('supplementDisplay').textContent = '-' + this.formatPrice(v.supplementAmount);
        document.getElementById('rechargeableDisplay').textContent = '+' + this.formatPrice(v.rechargeablePrice);

        // Result section
        const hasSavings = v.totalSavings > 0;
        const priceComparison = document.querySelector('.price-comparison');
        const originalPriceEl = document.querySelector('.original-price');
        const arrowEl = document.querySelector('.price-comparison .arrow');

        document.getElementById('finalPrice').textContent = this.formatPrice(v.finalPrice);

        // Vis kun sammenligning hvis der er besparelse
        if (hasSavings) {
            originalPriceEl.style.display = 'block';
            arrowEl.style.display = 'block';
            document.getElementById('originalPrice').textContent = this.formatPrice(v.totalBeforeSubsidies);
            document.getElementById('savingsAmount').textContent = this.formatPrice(v.totalSavings);
            document.getElementById('savingsPercent').textContent = v.savingsPercent + '%';
        } else {
            originalPriceEl.style.display = 'none';
            arrowEl.style.display = 'none';
        }

        // Show/hide savings banner
        const savingsBanner = document.getElementById('savingsBanner');
        savingsBanner.style.display = hasSavings ? 'flex' : 'none';

        // Details (i beregningsrækkefølge)
        document.getElementById('detailBase').textContent = this.formatPrice(v.basePrice);

        const rechargeableRow = document.getElementById('detailRechargeableRow');
        rechargeableRow.style.display = v.rechargeable ? 'flex' : 'none';
        document.getElementById('detailRechargeable').textContent = '+' + this.formatPrice(v.rechargeablePrice);

        // 1. Ældre Sagen (rabat på prisen)
        const seniorRow = document.getElementById('detailSeniorRow');
        seniorRow.style.display = v.seniorDiscount ? 'flex' : 'none';
        document.getElementById('detailSenior').textContent = '-' + this.formatPrice(v.seniorAmount);

        // 2. Offentligt tilskud
        const publicRow = document.getElementById('detailPublicRow');
        publicRow.style.display = v.publicSubsidy ? 'flex' : 'none';
        document.getElementById('detailPublic').textContent = '-' + this.formatPrice(v.publicAmount);

        // 3. Sygeforsikring
        const insuranceRow = document.getElementById('detailInsuranceRow');
        insuranceRow.style.display = v.healthInsurance ? 'flex' : 'none';
        document.getElementById('detailInsurance').textContent = '-' + this.formatPrice(v.insuranceAmount);

        // 4. Helbredstillæg
        const supplementRow = document.getElementById('detailSupplementRow');
        supplementRow.style.display = v.healthSupplement ? 'flex' : 'none';
        document.getElementById('detailSupplement').textContent = '-' + this.formatPrice(v.supplementAmount);

        // Animate price change
        this.animatePriceChange();

        // Update result card mood
        this.updateResultMood(v.savingsPercent);
    }

    animatePriceChange() {
        const finalPriceEl = document.getElementById('finalPrice');
        finalPriceEl.classList.remove('price-updated');
        void finalPriceEl.offsetWidth; // Trigger reflow
        finalPriceEl.classList.add('price-updated');
    }

    updateResultMood(savingsPercent) {
        const resultCard = document.querySelector('.result-card');
        resultCard.classList.remove('mood-great', 'mood-good', 'mood-ok');

        if (savingsPercent >= 50) {
            resultCard.classList.add('mood-great');
        } else if (savingsPercent >= 25) {
            resultCard.classList.add('mood-good');
        } else {
            resultCard.classList.add('mood-ok');
        }
    }

    formatPrice(amount) {
        return amount.toLocaleString('da-DK') + ' kr.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PriceCalculator();
});
