import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { tripsStyles } from "../../styles/TripsStyles";
import { deleteExpense } from "../../functions/tripsFunctions";
import AddExpenseModal from "../modals/AddExpenseModal";

export default function ExpensesTab({
  tripId,
  userId,
  expenses,
  categoryTotals,
  budget,
  onUpdate,
}) {
  const [addModalVisible, setAddModalVisible] = useState(false);

  const formatDate = (dateString) => {
    const dateStr = dateString.split(/[T ]/)[0]; // Handle both 'T' and space
    const [year, month, day] = dateStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${day}, ${year}`;
  };

  const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const remaining = budget - totalSpent;
  const budgetPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;

  const handleDeleteExpense = (expenseId) => {
    Alert.alert(
      "Delete Expense",
      "Remove this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteExpense(tripId, expenseId, userId);
              if (result.error) {
                Alert.alert("Error", result.error);
              } else {
                onUpdate();
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ]
    );
  };

  const renderExpenseItem = ({ item }) => (
    <View style={tripsStyles.expenseItem}>
      <View style={tripsStyles.expenseItemLeft}>
        <Text style={tripsStyles.expenseCategory}>
          {item.category.toUpperCase()}
        </Text>
        <Text style={tripsStyles.expenseDescription}>
          {item.description || "No description"}
        </Text>
        <Text style={tripsStyles.expenseDate}>
          {formatDate(item.expenseDate)}
        </Text>
      </View>

      <TouchableOpacity onPress={() => handleDeleteExpense(item.expenseId)}>
        <Text style={tripsStyles.expenseAmount}>
          ${parseFloat(item.amount).toFixed(2)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={tripsStyles.expenseSummaryCard}>
        <Text style={tripsStyles.expenseSummaryTitle}>Budget Summary</Text>

        <View style={tripsStyles.expenseSummaryRow}>
          <Text style={tripsStyles.expenseSummaryLabel}>Budget</Text>
          <Text style={tripsStyles.expenseSummaryValue}>
            {budget.toFixed(2)} RON
          </Text>
        </View>

        <View style={tripsStyles.expenseSummaryRow}>
          <Text style={tripsStyles.expenseSummaryLabel}>Spent</Text>
          <Text style={tripsStyles.expenseSummaryValue}>
            {totalSpent.toFixed(2)} RON
          </Text>
        </View>

        <View style={tripsStyles.expenseSummaryRow}>
          <Text style={tripsStyles.expenseSummaryLabel}>Remaining</Text>
          <Text
            style={[
              tripsStyles.expenseSummaryValue,
              { color: remaining < 0 ? '#f44336' : '#4CAF50' }
            ]}
          >
            ${remaining.toFixed(2)}
          </Text>
        </View>

        <View style={{ marginTop: 10 }}>
          <View style={tripsStyles.budgetProgressBar}>
            <View
              style={[
                tripsStyles.budgetProgressFill,
                budgetPercentage > 100 && tripsStyles.budgetOverFill,
                { width: `${Math.min(budgetPercentage, 100)}%` }
              ]}
            />
          </View>
        </View>
      </View>

      {categoryTotals.length > 0 && (
        <View style={tripsStyles.expenseSummaryCard}>
          <Text style={tripsStyles.expenseSummaryTitle}>By Category</Text>
          {categoryTotals.map((cat, index) => (
            <View key={index} style={tripsStyles.expenseSummaryRow}>
              <Text style={tripsStyles.expenseSummaryLabel}>
                {cat.category}
              </Text>
              <Text style={tripsStyles.expenseSummaryValue}>
                ${parseFloat(cat.total).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={tripsStyles.addExpenseButton}
        onPress={() => setAddModalVisible(true)}
      >
        <Text style={tripsStyles.addExpenseButtonText}>+ Add Expense</Text>
      </TouchableOpacity>

      {expenses.length === 0 ? (
        <View style={tripsStyles.emptyContainer}>
          <Text style={tripsStyles.emptyText}>
            No expenses recorded yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.expenseId.toString()}
          scrollEnabled={false}
        />
      )}

      <AddExpenseModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {
          setAddModalVisible(false);
          onUpdate();
        }}
        tripId={tripId}
        userId={userId}
      />
    </View>
  );
}
