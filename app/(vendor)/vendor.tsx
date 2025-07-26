import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DealService, Deal } from '@/services/dealService';
import { Plus, Trash2 } from 'lucide-react-native';
import DealCard from '@/components/ui/DealCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import Dialog from 'react-native-dialog';

export default function VendorScreen() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogDeal, setDialogDeal] = useState<Deal | null>(null);
  const [dialogValue, setDialogValue] = useState('');
  const [dialogError, setDialogError] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (backPressCount === 0) {
          setBackPressCount(1);
          Alert.alert(
            'Exit App',
            'Press back again to exit the app',
            [
              {
                text: 'Cancel',
                onPress: () => setBackPressCount(0),
                style: 'cancel',
              },
              {
                text: 'Exit',
                onPress: () => BackHandler.exitApp(),
                style: 'destructive',
              },
            ],
            { cancelable: false }
          );
          setTimeout(() => setBackPressCount(0), 2000);
          return true;
        } else {
          BackHandler.exitApp();
          return true;
        }
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
      };
    }, [backPressCount])
  );

  useEffect(() => {
    loadDeals();

    const subscription = DealService.subscribeToDeals((payload) => {
      loadDeals();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Redirect if user becomes unauthenticated
  useEffect(() => {
    if (!user) {
      router.replace('/auth');
    }
  }, [user]);

  const loadDeals = async () => {
    try {
      // Check if user is authenticated
      if (!user) {
        setDeals([]);
        setLoading(false);
        return;
      }

      const response = await DealService.getVendorDeals();
      if (response.success && response.deals) {
        const now = new Date();
        const activeDeals = [];
        for (const deal of response.deals) {
          if (deal.status === 'active' && new Date(deal.expiry_time) < now) {
            // Mark as expired in DB
            await DealService.updateDealStatus(deal.id, 'expired');
          } else if (deal.status === 'active') {
            activeDeals.push(deal);
          }
        }
        setDeals(activeDeals);
      } else {
        setDeals([]);
      }
    } catch (error) {
      setDeals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeals();
  };

  const handleMarkAsSold = async (dealId: string) => {
    Alert.alert(
      'Mark as Sold',
      'Are you sure you want to mark this deal as sold?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Sold',
          onPress: async () => {
            try {
              const response = await DealService.updateDealStatus(dealId, 'sold');
              if (response.success) {
                Alert.alert('Success', 'Deal marked as sold!');
                loadDeals();
              } else {
                Alert.alert('Error', response.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update deal status');
            }
          }
        }
      ]
    );
  };

  const handleDeleteDeal = async (dealId: string) => {
    Alert.alert(
      'Delete Deal',
      'Are you sure you want to delete this deal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await DealService.deleteDeal(dealId);
              if (response.success) {
                Alert.alert('Success', 'Deal deleted successfully!');
                loadDeals();
              } else {
                Alert.alert('Error', response.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete deal');
            }
          }
        }
      ]
    );
  };

  const handleEditQuantity = (deal: Deal) => {
    setDialogDeal(deal);
    setDialogValue(deal.remaining_quantity.toString());
    setDialogError('');
    setDialogVisible(true);
  };

  const handleDialogCancel = () => {
    setDialogVisible(false);
    setDialogDeal(null);
    setDialogValue('');
    setDialogError('');
  };

  const handleDialogConfirm = async () => {
    if (!dialogDeal) return;
    const quantity = parseInt(dialogValue);
    if (isNaN(quantity) || quantity < 0 || quantity > dialogDeal.quantity) {
      setDialogError(`Quantity must be between 0 and ${dialogDeal.quantity}`);
      return;
    }
    try {
      const response = await DealService.updateDealQuantity(dialogDeal.id, quantity);
      if (response.success) {
        Alert.alert('Success', 'Quantity updated successfully!');
        loadDeals();
        handleDialogCancel();
      } else {
        setDialogError(response.message);
      }
    } catch (error) {
      setDialogError('Failed to update quantity');
    }
  };

  const renderDealActions = (deal: Deal) => (
    <View style={styles.dealActions}>
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge,
          deal.status === 'active' && styles.activeBadge,
          deal.status === 'sold' && styles.soldBadge,
          deal.status === 'expired' && styles.expiredBadge
        ]}>
          <Text style={[
            styles.statusText,
            deal.status === 'active' && styles.activeText,
            deal.status === 'sold' && styles.soldText,
            deal.status === 'expired' && styles.expiredText
          ]}>
            {deal.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {deal.status === 'active' && (
        <View style={styles.actionButtons}>
          <Button
            title="Edit Quantity"
            onPress={() => handleEditQuantity(deal)}
            size="small"
            variant="secondary"
          />
          <Button
            title="Mark as Sold"
            onPress={() => handleMarkAsSold(deal.id)}
            size="small"
            variant="secondary"
          />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteDeal(deal.id)}
            activeOpacity={0.7}
          >
            <Trash2 color="#EF4444" size={16} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderDeal = ({ item }: { item: Deal }) => (
    <View style={styles.dealContainer}>
      <DealCard
        deal={item}
        onPress={() => router.push({
          pathname: '/deal-details/[id]',
          params: { id: item.id, from: 'vendor' }
        })}
        showDistance={false}
      />
      {renderDealActions(item)}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Plus color="#9CA3AF" size={48} />
      <Text style={styles.emptyTitle}>No deals posted yet</Text>
      <Text style={styles.emptyText}>
        Start posting your first deal to attract nearby buyers!
      </Text>
      <Button
        title="Post Your First Deal"
        onPress={() => router.push('/post-deal')}
        icon={<Plus color="#ffffff" size={16} />}
      />
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading your deals..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Deals</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/post-deal')}
            activeOpacity={0.7}
          >
            <Plus color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={deals}
        renderItem={renderDeal}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F97316"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      <Dialog.Container visible={dialogVisible}>
        <Dialog.Title>Update Remaining Quantity</Dialog.Title>
        <Dialog.Description>
          Enter the remaining quantity (0-{dialogDeal?.quantity ?? 0}):
        </Dialog.Description>
        <Dialog.Input
          value={dialogValue}
          onChangeText={setDialogValue}
          keyboardType="numeric"
        />
        {!!dialogError && <Text style={{ color: 'red', marginTop: 4 }}>{dialogError}</Text>}
        <Dialog.Button label="Cancel" onPress={handleDialogCancel} />
        <Dialog.Button label="Update" onPress={handleDialogConfirm} />
      </Dialog.Container>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  dealContainer: {
    marginBottom: 16,
  },
  dealActions: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginTop: -8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusContainer: {
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  soldBadge: {
    backgroundColor: '#DBEAFE',
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeText: {
    color: '#059669',
  },
  soldText: {
    color: '#3B82F6',
  },
  expiredText: {
    color: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});