import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { DealService, RevenueData, RepeatBuyer } from '@/services/dealService';
import { 
  ArrowLeft,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Calendar,
  Star
} from 'lucide-react-native';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const screenWidth = Dimensions.get('window').width;

export default function RevenueAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [repeatBuyers, setRepeatBuyers] = useState<RepeatBuyer[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [revenueResponse, dailyResponse, buyersResponse] = await Promise.all([
        DealService.getVendorRevenue(selectedPeriod),
        DealService.getDailyRevenue(selectedPeriod),
        DealService.getRepeatBuyers()
      ]);

      if (revenueResponse.success && revenueResponse.revenue) {
        setRevenueData(revenueResponse.revenue);
      }

      if (dailyResponse.success && dailyResponse.data) {
        setDailyRevenue(dailyResponse.data);
      }

      if (buyersResponse.success && buyersResponse.buyers) {
        setRepeatBuyers(buyersResponse.buyers);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#F97316',
    },
  };

  const formatChartData = () => {
    if (!dailyRevenue.length) return { labels: [], datasets: [{ data: [] }] };

    const labels = dailyRevenue.slice(-7).map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    });

    const data = dailyRevenue.slice(-7).map(item => parseFloat(item.revenue) || 0);

    return {
      labels,
      datasets: [{ data: data.length ? data : [0] }]
    };
  };

  const formatOrdersChartData = () => {
    if (!dailyRevenue.length) return { labels: [], datasets: [{ data: [] }] };

    const labels = dailyRevenue.slice(-7).map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    });

    const data = dailyRevenue.slice(-7).map(item => parseInt(item.order_count) || 0);

    return {
      labels,
      datasets: [{ data: data.length ? data : [0] }]
    };
  };

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Revenue Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[7, 30, 90].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Summary Cards */}
        {revenueData && (
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <DollarSign color="#059669" size={24} />
              <Text style={styles.summaryValue}>₹{revenueData.total_revenue.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
            </View>

            <View style={styles.summaryCard}>
              <ShoppingBag color="#3B82F6" size={24} />
              <Text style={styles.summaryValue}>{revenueData.total_orders}</Text>
              <Text style={styles.summaryLabel}>Total Orders</Text>
            </View>

            <View style={styles.summaryCard}>
              <TrendingUp color="#F97316" size={24} />
              <Text style={styles.summaryValue}>₹{revenueData.avg_order_value.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Avg Order Value</Text>
            </View>

            <View style={styles.summaryCard}>
              <Users color="#8B5CF6" size={24} />
              <Text style={styles.summaryValue}>{repeatBuyers.length}</Text>
              <Text style={styles.summaryLabel}>Repeat Buyers</Text>
            </View>
          </View>
        )}

        {/* Revenue Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Revenue (Last 7 Days)</Text>
          <LineChart
            data={formatChartData()}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Orders Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Orders (Last 7 Days)</Text>
          <BarChart
            data={formatOrdersChartData()}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>

        {/* Repeat Buyers */}
        {repeatBuyers.length > 0 && (
          <View style={styles.repeatBuyersCard}>
            <Text style={styles.cardTitle}>Top Repeat Buyers</Text>
            {repeatBuyers.slice(0, 5).map((buyer) => (
              <View key={buyer.buyer_id} style={styles.buyerRow}>
                <View style={styles.buyerInfo}>
                  <Star color="#F59E0B" size={16} />
                  <View style={styles.buyerDetails}>
                    <Text style={styles.buyerName}>{buyer.buyer_name}</Text>
                    <Text style={styles.buyerStats}>
                      {buyer.total_orders} orders • ₹{buyer.total_spent.toFixed(2)} spent
                    </Text>
                  </View>
                </View>
                <Text style={styles.lastOrder}>
                  {new Date(buyer.last_order_date).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.cardTitle}>Insights</Text>
          <View style={styles.insights}>
            <View style={styles.insight}>
              <Text style={styles.insightTitle}>Best Performing Period</Text>
              <Text style={styles.insightText}>
                Last {selectedPeriod} days generated ₹{revenueData?.total_revenue.toFixed(2) || '0'} in revenue
              </Text>
            </View>
            
            <View style={styles.insight}>
              <Text style={styles.insightTitle}>Customer Loyalty</Text>
              <Text style={styles.insightText}>
                {repeatBuyers.length} customers have made multiple purchases
              </Text>
            </View>
            
            {revenueData && revenueData.avg_order_value > 0 && (
              <View style={styles.insight}>
                <Text style={styles.insightTitle}>Average Order Value</Text>
                <Text style={styles.insightText}>
                  Customers spend an average of ₹{revenueData.avg_order_value.toFixed(2)} per order
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#F97316',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  repeatBuyersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  buyerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  buyerStats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  lastOrder: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  insights: {
    gap: 16,
  },
  insight: {
    paddingVertical: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});