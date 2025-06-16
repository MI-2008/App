import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import AppNavigator from './AppNavigator';




export default function App() {

  
   return <AppNavigator />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 250,
    height: 250,
  },
  welcomeText: {
    fontSize: 26,
    textAlign: 'center',
    color: '#015c32',
    fontWeight: 'bold',
  },
  nome: {
    fontSize: 29,
    textAlign: 'center',
    color: '#000000',
    fontWeight: 'bold',
  },

});
