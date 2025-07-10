// Este arquivo é o componente da tela "Meus Medicamentos" em TSX.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';

// Definindo o tipo para as props de navegação.
interface MedicinesScreenProps {
  navigation: any;
}

// Definindo a interface para o objeto de Medicamento
interface Medicine {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  time: string;
  customFrequencyDate?: string;
  observations: string;
}

const MEDICINES_STORAGE_KEY = '@my_medicines';

export default function MedicinesScreen({ navigation }: MedicinesScreenProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const route = useRoute();

  const loadMedicines = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedMedicines = await AsyncStorage.getItem(MEDICINES_STORAGE_KEY);
      if (storedMedicines) {
        setMedicines(JSON.parse(storedMedicines));
      } else {
        setMedicines([]);
      }
    } catch (error) {
      console.error("Erro ao carregar medicamentos:", error);
      Alert.alert("Erro", "Não foi possível carregar seus medicamentos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
      return () => {};
    }, [loadMedicines])
  );

  const removeMedicine = async (id: string) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja remover este medicamento?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Remover", 
          onPress: async () => {
            try {
              const updatedMedicines = medicines.filter(med => med.id !== id);
              await AsyncStorage.setItem(MEDICINES_STORAGE_KEY, JSON.stringify(updatedMedicines));
              setMedicines(updatedMedicines);
              Alert.alert("Sucesso", "Medicamento removido com sucesso!");
            } catch (error) {
              console.error("Erro ao remover medicamento:", error);
              Alert.alert("Erro", "Não foi possível remover o medicamento.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const isActive = (routeName: string) => {
    return route.name === routeName;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>💡Lembrete Medicamentos💡</Text>
        <Text style={styles.sloganText}></Text>
      </View>

      {/* Barra de Navegação Corrigida */}
      <View style={styles.navigationBar}>
        <View style={styles.navRow}>
          <TouchableOpacity 
            style={isActive('Lembretes') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('Lembretes')}
          >
            <Text style={isActive('Lembretes') ? styles.navTextActive : styles.navText}>
              📱Tela inicial
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={isActive('Medicines') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('Medicines')}
          >
            {/* Corrigido: estilo do texto para medicamentos */}
            <Text style={isActive('Medicines') ? styles.navTextActive : styles.navText}>
              💊 Medicamentos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity 
            style={isActive('MyAppointments') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('MyAppointments')}
          >
            <Text style={isActive('MyAppointments') ? styles.navTextActive : styles.navText}>
              🗓️ Consultas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={isActive('History') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('History')}
          >
            {/* Corrigido: estilo do texto para histórico */}
            <Text style={isActive('History') ? styles.navTextActive : styles.navText}>
              ⏰ Histórico
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.medicinesHeader}>
          <Text style={styles.medicinesTitle}>Meus Medicamentos</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddMedicine')}
          >
            <Text style={styles.addButtonText}>+ Adicionar Medicamento</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8A2BE2" />
            <Text style={styles.loadingText}>Carregando medicamentos...</Text>
          </View>
        ) : (
          <>
            {medicines.length === 0 ? (
              <View style={styles.noMedicinesContainer}>
                <Text style={styles.noMedicinesIcon}>💊</Text>
                <Text style={styles.noMedicinesTitle}>Nenhum medicamento cadastrado</Text>
                <Text style={styles.noMedicinesText}>Adicione seu primeiro medicamento para começar!</Text>
              </View>
            ) : (
              medicines.map((medicine) => (
                <View key={medicine.id} style={styles.medicineItem}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.medicineName}</Text>
                    <Text style={styles.medicineDetails}>
                      {medicine.dosage} - {medicine.frequency}{' '}
                      {medicine.frequency === 'custom_date' && `em ${medicine.customFrequencyDate}`}{' '}
                      às {medicine.time}
                    </Text>
                    {medicine.observations ? (
                      <Text style={styles.medicineObservations}>Obs: {medicine.observations}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeMedicine(medicine.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F0F2F5',
  },
  logoText: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#295700',
    marginBottom: 5,
    marginTop: 40,
  },
  sloganText: {
    fontSize: 16,
    color: '#666',
  },
  navigationBar: {
    flexDirection: 'column',
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    marginBottom: 20,
    marginHorizontal: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  navItemActive: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E6E6FA',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  navText: {
    fontSize: 20,
    color: '#295700',
    fontWeight: '500',
  },
  navTextActive: {
    fontSize: 20,
    color: '#295700',
    fontWeight: 'bold',
  },
  scrollViewContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  medicinesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  medicinesTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#3498DB', 
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noMedicinesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  noMedicinesIcon: {
    fontSize: 60,
    color: '#CCC',
    marginBottom: 15,
    transform: [{ rotate: '45deg' }],
  },
  noMedicinesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#777',
    marginBottom: 10,
    textAlign: 'center',
  },
  noMedicinesText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  medicineItem: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  medicineObservations: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FF6347',
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FFF',
  },
});