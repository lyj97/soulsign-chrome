<template>
	<div class="history-page">
		<mu-container>
			<div class="page-header">
				<h2>执行历史记录</h2>
				<div class="header-actions">
					<mu-button color="primary" @click="refreshHistory">刷新</mu-button>
					<mu-button @click="showSettings = true">设置</mu-button>
					<mu-button @click="exportHistory">导出</mu-button>
					<mu-button color="secondary" @click="clearAllHistory">清空</mu-button>
				</div>
			</div>

			<!-- 过滤器 -->
			<mu-row gutter>
				<mu-col span="3">
					<mu-select v-model="filters.taskName" label="任务" clearable>
						<mu-option
							v-for="taskName in availableTasks"
							:key="taskName"
							:value="taskName"
							:label="taskName"
						></mu-option>
					</mu-select>
				</mu-col>
				<mu-col span="2">
					<mu-select v-model="filters.type" label="类型" clearable>
						<mu-option value="" label="全部"></mu-option>
						<mu-option value="run" label="签到"></mu-option>
						<mu-option value="check" label="检查"></mu-option>
					</mu-select>
				</mu-col>
				<mu-col span="2">
					<mu-select v-model="filters.success" label="状态" clearable>
						<mu-option value="" label="全部"></mu-option>
						<mu-option value="true" label="成功"></mu-option>
						<mu-option value="false" label="失败"></mu-option>
					</mu-select>
				</mu-col>
				<mu-col span="2">
					<mu-select
						v-model="filters.daysPreset"
						label="最近天数"
						clearable
						@change="onDaysPresetChange"
					>
						<mu-option value="" label="全部"></mu-option>
						<mu-option value="1" label="1天"></mu-option>
						<mu-option value="3" label="3天"></mu-option>
						<mu-option value="7" label="7天"></mu-option>
						<mu-option value="15" label="15天"></mu-option>
						<mu-option value="30" label="30天"></mu-option>
						<mu-option value="60" label="60天"></mu-option>
						<mu-option value="90" label="90天"></mu-option>
						<mu-option value="custom" label="自定义"></mu-option>
					</mu-select>
					<mu-text-field
						v-if="filters.daysPreset === 'custom'"
						v-model="filters.days"
						label="自定义天数"
						type="number"
						:min="1"
						:max="365"
						style="margin-top: 8px"
					></mu-text-field>
				</mu-col>
				<mu-col span="3">
					<mu-button @click="resetFilters" style="margin-top: 16px">重置过滤</mu-button>
				</mu-col>
			</mu-row>

			<!-- 统计信息 -->
			<mu-card class="stats-card" v-if="stats">
				<mu-card-title>统计概览</mu-card-title>
				<mu-card-text>
					<mu-row gutter>
						<mu-col span="2">
							<div class="stat-item">
								<div class="stat-value">{{ stats.totalRecords }}</div>
								<div class="stat-label">总记录数</div>
							</div>
						</mu-col>
						<mu-col span="2">
							<div class="stat-item">
								<div class="stat-value success">{{ stats.successCount }}</div>
								<div class="stat-label">成功次数</div>
							</div>
						</mu-col>
						<mu-col span="2">
							<div class="stat-item">
								<div class="stat-value error">{{ stats.failureCount }}</div>
								<div class="stat-label">失败次数</div>
							</div>
						</mu-col>
						<mu-col span="2">
							<div class="stat-item">
								<div class="stat-value">{{ stats.successRate }}%</div>
								<div class="stat-label">成功率</div>
							</div>
						</mu-col>
						<mu-col span="2">
							<div class="stat-item">
								<div class="stat-value">{{ stats.checkCount }}</div>
								<div class="stat-label">登录检查</div>
							</div>
						</mu-col>
						<mu-col span="2">
							<div class="stat-item">
								<div class="stat-value">{{ stats.runCount }}</div>
								<div class="stat-label">签到执行</div>
							</div>
						</mu-col>
					</mu-row>
				</mu-card-text>
			</mu-card>

			<!-- 历史记录表格 -->
			<mu-data-table
				:loading="loading"
				:columns="columns"
				:data="historyData"
				stripe
				:hover="true"
				:sort.sync="sort"
			>
				<template slot-scope="{row}">
					<td>{{ row.taskName }}</td>
					<td>
						<mu-chip :color="row.type === 'run' ? 'primary' : 'secondary'" size="small">
							{{ row.type === "run" ? "签到" : "检查" }}
						</mu-chip>
					</td>
					<td>{{ new Date(row.timestamp).toLocaleString() }}</td>
					<td>
						<mu-chip :color="row.success ? 'success' : 'error'" size="small">
							{{ row.success ? "成功" : "失败" }}
						</mu-chip>
					</td>
					<td>{{ row.duration }}ms</td>
					<td class="result-cell">
						<div class="result-text" :title="row.result">
							{{ row.result.length > 50 ? row.result.substring(0, 50) + "..." : row.result }}
						</div>
					</td>
					<td>
						<mu-button icon small @click="showDetails(row)" title="查看详情">
							<mu-icon value="info"></mu-icon>
						</mu-button>
					</td>
				</template>
			</mu-data-table>

			<!-- 分页 -->
			<div class="pagination" v-if="totalRecords > pageSize">
				<mu-pagination
					:total="totalRecords"
					:current="currentPage"
					:page-size="pageSize"
					@change="changePage"
				></mu-pagination>
			</div>
		</mu-container>

		<!-- 详情对话框 -->
		<mu-dialog
			:open="detailDialog"
			@close="detailDialog = false"
			title="历史记录详情"
			scrollable
			class="history-detail-dialog"
			max-width="600px"
		>
			<div v-if="selectedRecord" class="history-detail-content">
				<mu-list>
					<mu-list-item>
						<mu-list-item-content>
							<mu-list-item-title>任务名称</mu-list-item-title>
							<mu-list-item-sub-title>{{ selectedRecord.taskName }}</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item>
						<mu-list-item-content>
							<mu-list-item-title>操作类型</mu-list-item-title>
							<mu-list-item-sub-title>{{
								selectedRecord.type === "run" ? "签到执行" : "登录检查"
							}}</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item>
						<mu-list-item-content>
							<mu-list-item-title>执行时间</mu-list-item-title>
							<mu-list-item-sub-title>{{
								new Date(selectedRecord.timestamp).toLocaleString()
							}}</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item>
						<mu-list-item-content>
							<mu-list-item-title>执行状态</mu-list-item-title>
							<mu-list-item-sub-title>
								<mu-chip :color="selectedRecord.success ? 'success' : 'error'" size="small">
									{{ selectedRecord.success ? "成功" : "失败" }}
								</mu-chip>
							</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item>
						<mu-list-item-content>
							<mu-list-item-title>耗时</mu-list-item-title>
							<mu-list-item-sub-title>{{ selectedRecord.duration }}ms</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item>
						<mu-list-item-content>
							<mu-list-item-title>执行结果</mu-list-item-title>
							<mu-list-item-sub-title>
								<pre class="result-detail">{{ selectedRecord.result }}</pre>
							</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item v-if="selectedRecord.logs && selectedRecord.logs.length">
						<mu-list-item-content>
							<mu-list-item-title>执行日志</mu-list-item-title>
							<mu-list-item-sub-title>
								<div class="logs-container">
									<div v-for="(log, index) in selectedRecord.logs" :key="index" class="log-item">
										{{ log }}
									</div>
								</div>
							</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item v-if="selectedRecord.error">
						<mu-list-item-content>
							<mu-list-item-title>错误信息</mu-list-item-title>
							<mu-list-item-sub-title>
								<pre class="error-detail">{{ selectedRecord.error }}</pre>
							</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
					<mu-list-item v-if="selectedRecord.params">
						<mu-list-item-content>
							<mu-list-item-title>执行参数</mu-list-item-title>
							<mu-list-item-sub-title>
								<pre class="params-detail">{{
									JSON.stringify(selectedRecord.params, null, 2)
								}}</pre>
							</mu-list-item-sub-title>
						</mu-list-item-content>
					</mu-list-item>
				</mu-list>
			</div>
			<mu-button slot="actions" flat @click="detailDialog = false">关闭</mu-button>
		</mu-dialog>

		<!-- 设置对话框 -->
		<mu-dialog :open="showSettings" @close="showSettings = false" title="历史记录设置">
			<mu-form :model="settings" ref="settingsForm">
				<mu-form-item label="启用历史记录" prop="enableLogging">
					<mu-switch v-model="settings.enableLogging"></mu-switch>
				</mu-form-item>
				<mu-form-item label="保留天数" prop="maxDays">
					<mu-text-field
						v-model.number="settings.maxDays"
						type="number"
						:min="1"
						:max="365"
					></mu-text-field>
				</mu-form-item>
				<mu-form-item label="每个任务最大记录数" prop="maxRecords">
					<mu-text-field
						v-model.number="settings.maxRecords"
						type="number"
						:min="100"
						:max="10000"
					></mu-text-field>
				</mu-form-item>
			</mu-form>
			<mu-button slot="actions" flat @click="showSettings = false">取消</mu-button>
			<mu-button slot="actions" flat color="primary" @click="saveSettings">保存</mu-button>
		</mu-dialog>
	</div>
</template>

<script>
import api from "@/common/api";

export default {
	name: "History",
	data() {
		return {
			loading: false,
			historyData: [],
			availableTasks: [],
			stats: null,
			filterTimer: null,
			filters: {
				taskName: "",
				type: "",
				success: "",
				days: "",
				daysPreset: "",
			},
			sort: {
				name: "timestamp",
				order: "desc",
			},
			currentPage: 1,
			pageSize: 50,
			totalRecords: 0,
			detailDialog: false,
			selectedRecord: null,
			showSettings: false,
			settings: {
				enableLogging: true,
				maxDays: 30,
				maxRecords: 1000,
			},
			columns: [
				{title: "任务名称", name: "taskName", sortable: true},
				{title: "类型", name: "type", sortable: true},
				{title: "执行时间", name: "timestamp", sortable: true},
				{title: "状态", name: "success", sortable: true},
				{title: "耗时", name: "duration", sortable: true},
				{title: "结果", name: "result"},
				{title: "操作", name: "actions"},
			],
		};
	},
	async created() {
		await this.loadSettings();
		await this.loadHistory();
		await this.loadStats();
	},
	watch: {
		filters: {
			handler() {
				// 延迟执行，避免频繁触发
				if (this.filterTimer) {
					clearTimeout(this.filterTimer);
				}
				this.filterTimer = setTimeout(() => {
					this.applyFilters();
				}, 500);
			},
			deep: true,
		},
	},
	beforeDestroy() {
		if (this.filterTimer) {
			clearTimeout(this.filterTimer);
		}
	},
	methods: {
		async loadHistory() {
			this.loading = true;
			try {
				const result = await api.getHistoryList({
					filters: this.filters,
					page: this.currentPage,
					pageSize: this.pageSize,
					sort: this.sort,
				});

				this.historyData = result.data || [];
				this.totalRecords = result.total || 0;
				this.availableTasks = result.availableTasks || [];
			} catch (err) {
				console.error("加载历史记录失败:", err);
				this.$toast.error("加载历史记录失败");
			} finally {
				this.loading = false;
			}
		},

		async loadStats() {
			try {
				const stats = await api.getHistoryStats(this.filters);
				this.stats = stats;
			} catch (err) {
				console.error("加载统计信息失败:", err);
			}
		},

		async loadSettings() {
			try {
				const settings = await api.getHistoryConfig();
				Object.assign(this.settings, settings);
			} catch (err) {
				console.error("加载设置失败:", err);
			}
		},

		async saveSettings() {
			try {
				await api.setHistoryConfig(this.settings);
				this.showSettings = false;
				this.$toast.success("设置保存成功");
			} catch (err) {
				console.error("保存设置失败:", err);
				this.$toast.error("保存设置失败");
			}
		},

		async refreshHistory() {
			await this.loadHistory();
			await this.loadStats();
		},

		async applyFilters() {
			this.currentPage = 1;
			await this.loadHistory();
			await this.loadStats();
		},

		onDaysPresetChange(value) {
			if (value === "custom") {
				// 选择自定义时，保持当前 days 值或设为空
				this.filters.days = this.filters.days || "";
			} else if (value === "") {
				// 选择"全部"时，清空 days
				this.filters.days = "";
			} else {
				// 选择预设值时，设置对应的天数
				this.filters.days = parseInt(value);
			}
		},

		resetFilters() {
			this.filters = {
				taskName: "",
				type: "",
				success: "",
				days: "",
				daysPreset: "",
			};
			// watch会自动触发applyFilters，所以不需要手动调用
		},

		async changePage(page) {
			this.currentPage = page;
			await this.loadHistory();
		},

		showDetails(record) {
			this.selectedRecord = record;
			this.detailDialog = true;
		},

		async exportHistory() {
			try {
				const data = await api.exportHistory(this.filters);
				const blob = new Blob([JSON.stringify(data, null, 2)], {
					type: "application/json",
				});
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `soulsign-history-${new Date().toISOString().split("T")[0]}.json`;
				a.click();
				window.URL.revokeObjectURL(url);
				this.$toast.success("历史记录导出成功");
			} catch (err) {
				console.error("导出失败:", err);
				this.$toast.error("导出失败");
			}
		},

		async clearAllHistory() {
			if (!confirm("确定要清空所有历史记录吗？此操作不可撤销。")) {
				return;
			}

			try {
				await api.clearHistory();
				await this.refreshHistory();
				this.$toast.success("历史记录已清空");
			} catch (err) {
				console.error("清空失败:", err);
				this.$toast.error("清空失败");
			}
		},
	},
};
</script>

<style scoped>
.history-page {
	padding: 20px 0;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24px;
}

.header-actions {
	display: flex;
	gap: 8px;
}

.stats-card {
	margin-bottom: 24px;
}

.stat-item {
	text-align: center;
	padding: 16px;
}

.stat-value {
	font-size: 24px;
	font-weight: bold;
	margin-bottom: 4px;
}

.stat-value.success {
	color: #4caf50;
}

.stat-value.error {
	color: #f44336;
}

.stat-label {
	font-size: 12px;
	color: #666;
}

.result-cell {
	max-width: 200px;
}

.result-text {
	word-break: break-word;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.pagination {
	display: flex;
	justify-content: center;
	margin-top: 24px;
}

.result-detail,
.error-detail,
.params-detail {
	background: #f5f5f5;
	padding: 8px;
	border-radius: 4px;
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 150px;
	overflow-y: auto;
	font-size: 12px;
	font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
	line-height: 1.4;
	border: 1px solid #e0e0e0;
}

.error-detail {
	background: #fff5f5;
	color: #d32f2f;
	border-color: #ffcdd2;
	max-height: 120px;
}

.params-detail {
	max-height: 100px;
}

.logs-container {
	background: #f5f5f5;
	padding: 8px;
	border-radius: 4px;
	max-height: 150px;
	overflow-y: auto;
	border: 1px solid #e0e0e0;
}

.log-item {
	font-size: 12px;
	padding: 2px 0;
	border-bottom: 1px solid #eee;
	word-break: break-word;
}

.log-item:last-child {
	border-bottom: none;
}

/* 对话框样式优化 */
.mu-dialog .mu-dialog-body {
	max-height: 70vh;
	overflow-y: auto;
}

/* 详情对话框特殊样式 */
.history-detail-dialog .mu-dialog-body {
	max-height: 60vh;
	padding: 0;
}

.history-detail-content {
	max-height: 55vh;
	overflow-y: auto;
	padding: 16px;
}
</style>
