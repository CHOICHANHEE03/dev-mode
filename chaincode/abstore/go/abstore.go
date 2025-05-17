/*
Copyright IBM Corp. 2016 All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
   "encoding/json"
   "fmt"
   "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ABstore Chaincode implementation
type ABstore struct {
   contractapi.Contract
}
var Admin = "Admin"

// 카드 내용 json화할려고 구조체 사용
type CardInfo struct{
   CardName string `json:"CardName"`
   CardNum string `json:"CardNum"`
   Username string `json:"Username"`
   Exdate string `json:"Exdate"`
   Password string `json:"Password"`
   Balance int `json:"Balance"`
}



//등록
func (t *ABstore) Init(ctx contractapi.TransactionContextInterface, CardName string, CardNum string, 
   Username string, Exdate string, Password string) error{
   //fmt.Println("ABstore Init")
   var err error
   // Initialize the chaincode
   //fmt.Printf("Aval = %d, Bval = %d", Aval, Bval)
   // Write the state to the ledger

   //카드 객체
   card := CardInfo{
      CardName: CardName,
      CardNum: CardNum,
      Username: Username,
      Exdate: Exdate,
      Password: Password,
      Balance: 0,
   }

   //json 직렬
   cardJSON, err := json.Marshal(card)
   if err != nil {
      return fmt.Errorf("Failed to marshal JSON: %v", err)
   }

   err = ctx.GetStub().PutState(CardName, cardJSON)
   if err != nil {
      return err
   }

   return nil
}

func (t *ABstore) AddBalance(ctx contractapi.TransactionContextInterface, CardName string, amount int) error {
   amountbytes, err := ctx.GetStub().GetState(CardName)
   if err != nil {
       return fmt.Errorf("Failed to get state for %s: %v", CardName, err)
   }
   if amountbytes == nil {
       return fmt.Errorf("Card %s does not exist", CardName)
   }

   var card CardInfo
   err = json.Unmarshal(amountbytes, &card)
   if err != nil {
       return fmt.Errorf("invalid card data format for %s: %v", CardName, err)
   }

   card.Balance += amount
   fmt.Printf("cardBalance for %s = %d\n", CardName, card.Balance)

   cardJSON, err := json.Marshal(card)
   if err != nil {
       return fmt.Errorf("Failed to marshal updated card info: %v", err)
   }

   err = ctx.GetStub().PutState(CardName, cardJSON)
   if err != nil {
       return fmt.Errorf("Failed to update card info in ledger: %v", err)
   }

   return nil
}




//모든 내용 조회
func (t *ABstore) GetAllQuery(ctx contractapi.TransactionContextInterface) ([]CardInfo, error) {
   resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
   if err != nil {
       return nil, err
   }
   defer resultsIterator.Close()

   var cards []CardInfo
   for resultsIterator.HasNext() {
       queryResponse, err := resultsIterator.Next()
       if err != nil {
           return nil, err
       }
       var card CardInfo
       err = json.Unmarshal(queryResponse.Value, &card)
       if err != nil {
           return nil, fmt.Errorf("Failed to unmarshal JSON key %s : %v", queryResponse.Key, err)
       }
       cards = append(cards, card)
   }

   return cards, nil
}




func main() {
   cc, err := contractapi.NewChaincode(new(ABstore))
   if err != nil {
      panic(err.Error())
   }
   if err := cc.Start(); err != nil {
      fmt.Printf("Error starting ABstore chaincode: %s", err)
   }
}
