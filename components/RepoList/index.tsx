import React from 'react'
import {FlatList} from 'react-native'
import {RepoItem} from '../RepoItem'
import { GithubRepository } from '../../types'
import {styles} from './styles'

interface Props{
    repositories:GithubRepository[]
    
}

export function RepoList({repositories}:Props){

    return(
       <FlatList 
       data={repositories}    
       keyExtractor={(item)=>item.id.toString()}   
       renderItem={({item})=><RepoItem repository={item}/>}    
    />
        
    )
}