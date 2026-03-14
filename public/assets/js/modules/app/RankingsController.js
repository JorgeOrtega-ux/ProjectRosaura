// public/assets/js/modules/app/RankingsController.js

import { ApiService } from '../../core/api/ApiServices.js';

export class RankingsController {
    constructor() {
        this.api = new ApiService();
    }

    async init() {
        await this.loadRankings();
    }

    async loadRankings() {
        const container = document.getElementById('rankings-data-container');
        if (!container) return;

        try {
            const response = await this.api.getTopRankings();

            if (response.success && response.data && response.data.length > 0) {
                this.renderRankings(response.data, container);
            } else {
                container.innerHTML = `
                    <div class="component-empty-state" style="padding: 48px 16px; text-align: center;">
                        <span class="material-symbols-rounded" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;">pending_actions</span>
                        <p>Los rankings aún se están procesando o no hay datos suficientes. Vuelve más tarde.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error cargando los rankings:", error);
            container.innerHTML = `<div class="component-empty-state" style="color: var(--text-error); padding: 48px 16px; text-align: center;">Ocurrió un error al cargar el Top 100.</div>`;
        }
    }

    renderRankings(rankings, container) {
        let html = '';
        const basePath = window.AppBasePath || '';

        rankings.forEach(item => {
            let trendIcon = '⬜';
            let trendClass = 'trend-neutral';
            let diffText = '';

            if (item.trend === 'up') {
                trendIcon = '🟩';
                trendClass = 'trend-up';
                let diff = item.previous_rank ? item.previous_rank - item.rank : '';
                if (diff) diffText = `+${diff}`;
            } else if (item.trend === 'down') {
                trendIcon = '🟥';
                trendClass = 'trend-down';
                let diff = item.previous_rank ? item.rank - item.previous_rank : '';
                if (diff) diffText = `-${diff}`;
            }

            const avatarUrl = item.avatar ? `${basePath}/${item.avatar}` : `${basePath}/public/storage/profilePictures/default/avatar.png`;
            const profileUrl = `${basePath}/@${item.identifier}`;
            const formattedScore = parseFloat(item.score).toLocaleString('en-US');

            html += `
                <a href="${profileUrl}" class="ranking-item" data-rank="${item.rank}" onclick="window.spaRouter.navigate('${profileUrl}'); return false;">
                    <div class="rank-col-pos">${item.rank}</div>
                    <div class="rank-col-trend ${trendClass}">
                        <span>${trendIcon}</span>
                        <span class="trend-diff">${diffText}</span>
                    </div>
                    <div class="rank-col-channel">
                        <img src="${avatarUrl}" alt="${item.username}" class="rank-avatar">
                        <div class="rank-channel-info">
                            <span class="rank-channel-name">${item.username}</span>
                            <span class="rank-channel-handle">@${item.identifier}</span>
                        </div>
                    </div>
                    <div class="rank-col-score">${formattedScore}</div>
                </a>
            `;
        });

        container.innerHTML = html;
    }
}