import React from 'react'
import {View,Text} from 'react-native'
import {styles} from './styles'
import {GithubRepository} from '../../types'


interface Props{
    repository:GithubRepository
}   


export function RepoItem({repository}:Props){
      return(
        <View style = {styles.repoContainer}>
            <Text style = {styles.repoTitle}>{repository.name}</Text>
            <Text>{repository.descriptiom || 'Sem descrição'}</Text>
        </View>

      )
}