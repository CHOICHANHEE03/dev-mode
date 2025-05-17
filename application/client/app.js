'use strict';

var app = angular.module('application', []);

app.controller('AppCtrl', function($scope, appFactory){
   $("#success_init").hide();
   $("#success_add_balance").hide();
   $("#success_queryall").hide();

   $scope.initAB = function(){
       appFactory.initAB($scope.abstore, function(data){
           if(data == "Success")
           $scope.init_ab = "success";
           $("#success_init").show();
       });
   }

   $scope.add_balance = function(){
    appFactory.add_balance($scope.abstore, function(data){
        if(data == "Success")
        $scope.add_balance_ab = "success";
        $("#success_add_balance").show();
    });
}

    $scope.queryAll = function(){
        appFactory.queryAll(function(data){
            $scope.query_all = data;
            $("#success_queryall").show();
        });
    }
});

app.factory('appFactory', function($http){
      
    var factory = {};
 
    // 카드 등록 (POST /init)
    factory.initAB = function(data, callback){
        $http.post('/init', {
            CardName: data.CardName,
            CardNum: data.CardNum,
            Username: data.Username,
            Exdate: data.Exdate,
            Password: data.Password
        }).then(function(response){
            callback("Success");
        }, function(error){
            callback("Error");
        });
    }

    // 잔액 추가 (GET /add_balance)
    factory.add_balance = function(data, callback){
        $http.get('/add_balance', {
            params: {
                CardName: data.CardName,
                amount: data.amount
            }
        }).then(function(response){
            callback("Success");
        }, function(error){
            callback("Error");
        });
    }


    // 전체 카드 조회 (GET /queryall)
    factory.queryAll = function(callback){
        $http.get('/queryall').then(function(response){
            callback(response.data);
        }, function(error){
            callback([]);
        });
    }
    
    return factory;
});
