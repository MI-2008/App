import React from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { styles } from './styles';


interface SearchBarProps {
  username: string; 
  onUsernameChange: (text: string) => void; 
  onSearch: () => void;
}


export function SearchBar({ username, onUsernameChange, onSearch }: SearchBarProps) {
  return (
    <View style={styles.container}> 
      

      <Text style={styles.title}>
        Nome do usuário
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Digite o nome do usuário do GitHub" 
        value={username} 
        onChangeText={onUsernameChange} 
      />
      <Button title='Buscar' onPress={onSearch} /> 
    </View>
  );
}