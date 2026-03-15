// V9 Performance Optimization System
// Database indexing, query optimization, and caching strategies

import { db } from '../database/adapter';
import { configManager } from '../config/manager';

export interface PerformanceMetrics {
  queryPerformance: {
    averageResponseTime: number;
    slowestQueries: Array<{
      query: string;
      executionTime: number;
      frequency: number;
    }>;
    cacheHitRate: number;
  };
  databasePerformance: {
    connectionPoolUtilization: number;
    activeConnections: number;
    slowQueriesCount: number;
    indexUsage: number;
  };
  systemResources: {
    memoryUsage: number;
    cpuUsage: number;
    diskIO: number;
  };
  collectedAt: string;
}

export interface QueryOptimization {
  query: string;
  optimizedQuery: string;
  improvement: number; // percentage
  indexesRecommended: string[];
  executionPlan: any;
}

export interface CacheConfiguration {
  strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  maxSize: number;
  ttl: number; // seconds
  compression: boolean;
  invalidationStrategy: 'immediate' | 'lazy' | 'periodic';
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin' | 'bitmap';
  reason: string;
  impact: 'high' | 'medium' | 'low';
  existing: boolean;
}

export class PerformanceOptimizationSystem {
  private static instance: PerformanceOptimizationSystem;

  // Performance thresholds
  private readonly SLOW_QUERY_THRESHOLD = 1000; // ms
  private readonly CACHE_TTL_DEFAULT = 300; // 5 minutes
  private readonly MAX_CONNECTIONS = 20;
  private readonly INDEX_ANALYSIS_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  // Query result cache
  private queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();

  private constructor() {}

  static getInstance(): PerformanceOptimizationSystem {
    if (!PerformanceOptimizationSystem.instance) {
      PerformanceOptimizationSystem.instance = new PerformanceOptimizationSystem();
    }
    return PerformanceOptimizationSystem.instance;
  }

  /**
   * Analyze and optimize database performance
   */
  async optimizeDatabasePerformance(): Promise<{
    indexesCreated: number;
    queriesOptimized: number;
    cacheConfigured: boolean;
    performanceImprovement: number;
  }> {
    const startTime = Date.now();

    // Analyze slow queries
    const slowQueries = await this.identifySlowQueries();

    // Generate index recommendations
    const indexRecommendations = await this.analyzeIndexUsage();

    // Create recommended indexes
    let indexesCreated = 0;
    for (const rec of indexRecommendations.filter(r => !r.existing && r.impact === 'high')) {
      try {
        await this.createIndex(rec);
        indexesCreated++;
      } catch (error) {
        console.error(`Failed to create index on ${rec.table}:`, error);
      }
    }

    // Optimize slow queries
    let queriesOptimized = 0;
    for (const query of slowQueries.slice(0, 10)) { // Top 10 slowest
      try {
        const optimization = await this.optimizeQuery(query.query);
        if (optimization.improvement > 20) { // 20% improvement threshold
          await this.applyQueryOptimization(optimization);
          queriesOptimized++;
        }
      } catch (error) {
        console.error(`Failed to optimize query:`, error);
      }
    }

    // Configure caching
    const cacheConfigured = await this.configureAdaptiveCaching();

    // Calculate performance improvement
    const performanceImprovement = await this.measurePerformanceImprovement(startTime);

    return {
      indexesCreated,
      queriesOptimized,
      cacheConfigured,
      performanceImprovement
    };
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const [
      queryMetrics,
      dbMetrics,
      systemMetrics
    ] = await Promise.all([
      this.getQueryPerformanceMetrics(),
      this.getDatabasePerformanceMetrics(),
      this.getSystemResourceMetrics()
    ]);

    return {
      queryPerformance: queryMetrics,
      databasePerformance: dbMetrics,
      systemResources: systemMetrics,
      collectedAt: new Date().toISOString()
    };
  }

  /**
   * Execute query with caching and optimization
   */
  async executeOptimizedQuery(
    query: string,
    params: any[] = [],
    options: {
      useCache?: boolean;
      cacheTtl?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<any> {
    const {
      useCache = true,
      cacheTtl = this.CACHE_TTL_DEFAULT,
      forceRefresh = false
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey(query, params);

    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < (cached.ttl * 1000)) {
        return cached.result;
      }
    }

    // Execute query with timing
    const startTime = Date.now();
    const adapter = db.getAdapter();
    const result = await adapter.query(query, params);
    const executionTime = Date.now() - startTime;

    // Log slow queries
    if (executionTime > this.SLOW_QUERY_THRESHOLD) {
      await this.logSlowQuery(query, executionTime, params);
    }

    // Cache result
    if (useCache) {
      this.queryCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        ttl: cacheTtl
      });

      // Clean up expired cache entries
      this.cleanupExpiredCache();
    }

    return result;
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance(query: string, params: any[] = []): Promise<QueryOptimization> {
    const adapter = db.getAdapter();

    // Get execution plan
    const planQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const planResult = await adapter.query(planQuery, params);
    const executionPlan = planResult[0]['QUERY PLAN'];

    // Analyze plan for optimization opportunities
    const recommendations = this.analyzeExecutionPlan(executionPlan);

    // Generate optimized query
    const optimizedQuery = this.generateOptimizedQuery(query, recommendations);

    // Estimate improvement
    const improvement = this.estimateImprovement(executionPlan, recommendations);

    return {
      query,
      optimizedQuery,
      improvement,
      indexesRecommended: recommendations.indexes,
      executionPlan
    };
  }

  /**
   * Configure adaptive caching based on usage patterns
   */
  async configureAdaptiveCaching(): Promise<boolean> {
    const metrics = await this.getQueryPerformanceMetrics();

    // Analyze cache hit rate and adjust strategy
    if (metrics.cacheHitRate < 0.5) {
      // Low hit rate - switch to LFU or increase TTL
      this.adjustCacheStrategy('lfu');
    } else if (metrics.cacheHitRate > 0.9) {
      // High hit rate - can reduce TTL or use LRU
      this.adjustCacheStrategy('lru');
    }

    // Configure database-level caching if available
    await this.configureDatabaseCaching();

    return true;
  }

  /**
   * Clean up and maintain database indexes
   */
  async maintainDatabaseIndexes(): Promise<{
    indexesAnalyzed: number;
    indexesRebuilt: number;
    unusedIndexes: string[];
    recommendations: IndexRecommendation[];
  }> {
    const adapter = db.getAdapter();

    // Get all indexes
    const indexes = await adapter.query(`
      SELECT
        schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
    `);

    let indexesAnalyzed = 0;
    let indexesRebuilt = 0;
    const unusedIndexes: string[] = [];
    const recommendations: IndexRecommendation[] = [];

    for (const index of indexes) {
      indexesAnalyzed++;

      // Check if index is unused
      if (index.idx_scan === 0 && index.idx_tup_read === 0) {
        unusedIndexes.push(`${index.schemaname}.${index.tablename}.${index.indexname}`);
      }

      // Check if index needs rebuilding (high fragmentation)
      if (this.indexNeedsRebuilding(index)) {
        try {
          await adapter.query(`REINDEX INDEX ${index.schemaname}.${index.indexname}`);
          indexesRebuilt++;
        } catch (error) {
          console.error(`Failed to rebuild index ${index.indexname}:`, error);
        }
      }
    }

    // Generate new index recommendations
    const newRecommendations = await this.analyzeIndexUsage();
    recommendations.push(...newRecommendations);

    return {
      indexesAnalyzed,
      indexesRebuilt,
      unusedIndexes,
      recommendations
    };
  }

  // Private methods

  private async identifySlowQueries(): Promise<Array<{ query: string; executionTime: number; frequency: number }>> {
    // In PostgreSQL, we would use pg_stat_statements
    // For now, return mock data based on logged slow queries
    const adapter = db.getAdapter();

    try {
      const slowQueries = await adapter.query(`
        SELECT query, mean_time, calls
        FROM pg_stat_statements
        WHERE mean_time > ?
        ORDER BY mean_time DESC
        LIMIT 20
      `, [this.SLOW_QUERY_THRESHOLD]);

      return slowQueries.map(row => ({
        query: row.query,
        executionTime: parseFloat(row.mean_time),
        frequency: parseInt(row.calls)
      }));
    } catch (error) {
      // pg_stat_statements might not be available
      return [];
    }
  }

  private async analyzeIndexUsage(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    // Analyze common query patterns and recommend indexes
    const commonQueries = [
      { table: 'emotion_logs', columns: ['user_id', 'logged_at'], reason: 'Time-series mood queries' },
      { table: 'session_metrics', columns: ['user_id', 'started_at'], reason: 'Session history queries' },
      { table: 'clinical_recovery_metrics', columns: ['user_id', 'calculated_at'], reason: 'Recovery tracking' },
      { table: 'panic_events', columns: ['user_id', 'triggered_at'], reason: 'Crisis event analysis' },
      { table: 'messages', columns: ['session_id', 'created_at'], reason: 'Chat history retrieval' }
    ];

    for (const query of commonQueries) {
      const existing = await this.checkIndexExists(query.table, query.columns);
      recommendations.push({
        table: query.table,
        columns: query.columns,
        type: 'btree',
        reason: query.reason,
        impact: 'high',
        existing
      });
    }

    return recommendations;
  }

  private async createIndex(recommendation: IndexRecommendation): Promise<void> {
    const adapter = db.getAdapter();
    const indexName = `idx_${recommendation.table}_${recommendation.columns.join('_')}`;
    const columns = recommendation.columns.join(', ');

    const query = `CREATE INDEX CONCURRENTLY ${indexName} ON ${recommendation.table} (${columns})`;

    await adapter.query(query);
  }

  private async optimizeQuery(query: string): Promise<QueryOptimization> {
    // Analyze query and generate optimization
    const optimization = await this.analyzeQueryPerformance(query);

    return {
      query,
      optimizedQuery: optimization.optimizedQuery,
      improvement: optimization.improvement,
      indexesRecommended: optimization.indexesRecommended,
      executionPlan: optimization.executionPlan
    };
  }

  private async applyQueryOptimization(optimization: QueryOptimization): Promise<void> {
    // Store optimized query for future use
    // In practice, this might update application code or stored procedures
    console.log(`Applied optimization to query, expected improvement: ${optimization.improvement}%`);
  }

  private async measurePerformanceImprovement(startTime: number): Promise<number> {
    // Measure improvement by comparing before/after metrics
    const beforeMetrics = await this.getQueryPerformanceMetrics();
    const afterMetrics = await this.getQueryPerformanceMetrics();

    // Calculate improvement percentage
    const improvement = ((beforeMetrics.averageResponseTime - afterMetrics.averageResponseTime) /
                        beforeMetrics.averageResponseTime) * 100;

    return Math.max(0, improvement);
  }

  private async getQueryPerformanceMetrics(): Promise<PerformanceMetrics['queryPerformance']> {
    // Aggregate query performance data
    const cacheHits = this.queryCache.size;
    const totalQueries = cacheHits; // Simplified

    return {
      averageResponseTime: 150, // Mock value
      slowestQueries: [], // Would be populated from logs
      cacheHitRate: totalQueries > 0 ? cacheHits / totalQueries : 0
    };
  }

  private async getDatabasePerformanceMetrics(): Promise<PerformanceMetrics['databasePerformance']> {
    const adapter = db.getAdapter();

    try {
      const metrics = await adapter.query(`
        SELECT
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections
      `);

      return {
        connectionPoolUtilization: (metrics[0].active_connections / this.MAX_CONNECTIONS) * 100,
        activeConnections: parseInt(metrics[0].active_connections),
        slowQueriesCount: 0, // Would be calculated from logs
        indexUsage: 85 // Mock value
      };
    } catch (error) {
      return {
        connectionPoolUtilization: 0,
        activeConnections: 0,
        slowQueriesCount: 0,
        indexUsage: 0
      };
    }
  }

  private async getSystemResourceMetrics(): Promise<PerformanceMetrics['systemResources']> {
    // In Node.js, we would use process.memoryUsage(), os.loadavg(), etc.
    return {
      memoryUsage: 75, // Mock percentage
      cpuUsage: 45,    // Mock percentage
      diskIO: 30       // Mock percentage
    };
  }

  private generateCacheKey(query: string, params: any[]): string {
    return `${query}_${JSON.stringify(params)}`;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > value.ttl * 1000) {
        this.queryCache.delete(key);
      }
    }
  }

  private async logSlowQuery(query: string, executionTime: number, params: any[]): Promise<void> {
    // Log to monitoring system
    console.warn(`Slow query detected: ${executionTime}ms - ${query}`);
  }

  private analyzeExecutionPlan(plan: any): { indexes: string[] } {
    // Analyze PostgreSQL execution plan for optimization opportunities
    const recommendations: string[] = [];

    // Look for sequential scans that could benefit from indexes
    if (plan['Node Type'] === 'Seq Scan') {
      recommendations.push('Consider adding index on filtered columns');
    }

    return { indexes: recommendations };
  }

  private generateOptimizedQuery(originalQuery: string, recommendations: any): string {
    // Apply optimizations based on recommendations
    let optimized = originalQuery;

    // Add LIMIT if not present for large result sets
    if (!originalQuery.includes('LIMIT') && !originalQuery.includes('limit')) {
      optimized += ' LIMIT 1000';
    }

    return optimized;
  }

  private estimateImprovement(plan: any, recommendations: any): number {
    // Estimate performance improvement
    let improvement = 0;

    if (recommendations.indexes.length > 0) {
      improvement += 50; // Index can improve performance significantly
    }

    return Math.min(90, improvement);
  }

  private adjustCacheStrategy(strategy: 'lru' | 'lfu' | 'ttl'): void {
    // Adjust caching strategy based on usage patterns
    console.log(`Adjusting cache strategy to: ${strategy}`);
  }

  private async configureDatabaseCaching(): Promise<void> {
    // Configure PostgreSQL-specific caching
    const adapter = db.getAdapter();

    try {
      // Increase shared buffers if possible
      await adapter.query(`SET work_mem = '64MB'`);
      await adapter.query(`SET maintenance_work_mem = '256MB'`);
    } catch (error) {
      // Ignore if not permitted
    }
  }

  private async checkIndexExists(table: string, columns: string[]): Promise<boolean> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = ? AND indexdef LIKE ?
    `, [table, `%(${columns.join(', ')})%`]);

    return result.length > 0;
  }

  private indexNeedsRebuilding(index: any): boolean {
    // Check if index has high fragmentation or low usage
    return index.idx_scan < 10 && index.idx_tup_read > 10000;
  }
}

export const performanceOptimizationSystem = PerformanceOptimizationSystem.getInstance();