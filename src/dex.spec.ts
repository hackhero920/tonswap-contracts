import {Address} from "ton";
import {readFile} from "fs/promises";
import {DexConfig} from "./dex.data";
import { DexDebug } from "./dex.debug";
import BN from "bn.js";
import {SendMsgOutAction, parseTrc20Transfer, toUnixTime, sliceToString, toDecimals, fromDecimals} from "./utils"
import { init as initJestHelpers } from "./test-utils";
import {Trc20Debug} from "./trc20.debug";

initJestHelpers() 

const bobAddress = Address.parseFriendly('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t').address;
const aliceAddress = Address.parseFriendly('EQDjhy1Ig-S0vKCWwd3XZRKODGx0RJyhqW37ZDMl-pgv8iBr').address;
const PROTOCOL_ADMIN = Address.parseFriendly('EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI').address;
const SUSHI_TOKEN_V2 = Address.parseFriendly('kQCLjyIQ9bF5t9h3oczEX3hPVK4tpW2Dqby0eHOH1y5_Nk1x').address;
const TOKEN_ADMIN = Address.parseFriendly('EQCbPJVt83Noxmg8Qw-Ut8HsZ1lz7lhp4k0v9mBX2BJewhpe').address;


/*  OP+Actions */
const ONE_HOUR = 3600;
const ONE_DAY = ONE_HOUR * 24;
const ONE_YEAR = ONE_HOUR * 365;
const DUST = new BN(8);
const OP_UPDATE_TOKEN_REWARDS = 9;
const OP_UPDATE_PROTOCOL_REWARDS = 10;
const ADD_LIQUIDITY_SUB_OP = new BN(2);

const DEFAULT_FEE = 10000;
var configData = {
    name: 'LP Token',
    symbol: 'LP',
    decimals: new BN(9),
    totalSupply: toDecimals(0),
    tokenReserves: toDecimals(0),
    tonReserves: toDecimals(0),
    tokenAddress: SUSHI_TOKEN_V2,
    tokenAdmin: TOKEN_ADMIN,
    tokenAllocPoints: new BN(500),
    protocolAdmin: PROTOCOL_ADMIN,
    protocolAllocPoints: new BN(0),
} as DexConfig;

const baseLP = new BN('31622776601');
const senderInitialBalance = new BN('200000000000000');
const magic = new BN ('11574074074074');

describe('SmartContract', () => {
    let source: string
    
    beforeAll(async () => {
        source = (await readFile('./src/dex.func')).toString('utf-8')
    })

    // it('should init Test Data', async ()=>{
    //     const contract = await DexDebug.create(configData);
    //     const res = await contract.initTestData(bobAddress);
    //     expect(res.exit_code).toBe(0);
    //     expect((await contract.getData()).initialized.toNumber()).toBe(1);
    // })

    it('should init external', async ()=>{
        const contract = await DexDebug.create(configData);
        const res = await contract.init(bobAddress);
        expect(res.exit_code).toBe(0);
        expect((await contract.getData()).initialized.toNumber()).toBe(1);
    })

    it('should get token Data', async () =>    {

        const contract = await DexDebug.create(configData)
        const tokenData = await contract.getData();
        console.log('tokenData.tokenAddress.toFirendly', tokenData.tokenAddress)
        expect(tokenData.name == configData.name).toBe(true);
        expect(tokenData.symbol == configData.symbol ).toBe(true);
        expect(tokenData.decimals.cmp(configData.decimals)).toBe(0);
        expect(tokenData.totalSupply.cmp(configData.totalSupply)).toBe(0);
        expect(tokenData.tokenAddress.equals(configData.tokenAddress)).toBe(true);

    })

    it('should return admin Data', async () =>    {
    
        const contract = await DexDebug.create(configData)
        const tokenData = await contract.getAdminData();
        expect(tokenData.admin.equals(configData.tokenAdmin)).toBe(true);
        expect(tokenData.adminPoints.toNumber()).toEqual(configData.tokenAllocPoints.toNumber());
        expect(tokenData.protocol.equals(configData.protocolAdmin)).toBe(true);
        expect(tokenData.protocolPoints.toNumber()).toEqual(configData.protocolAllocPoints.toNumber());
    })


    // it('should Add Liquidity (Using trc20 contract)', async () => {
    //
    //     const tokensToAdd = toDecimals(100);
    //     const tonCoins = toDecimals(10);
    //
    //     const contract = await DexDebug.create(configData)
    //     const trc20Contract = await Trc20Debug.create();
    //     const _mintRes = await trc20Contract.mint(bobAddress);
    //     console.log(_mintRes);
    //     expect(_mintRes.exit_code).toBe(0);
    //
    //
    //     const transfer = await trc20Contract.transferOverloaded(bobAddress, aliceAddress, tokensToAdd, ADD_LIQUIDITY_SUB_OP, new BN(5), tonCoins);
    //     console.log(transfer);
    //     throw 1;
    //     console.log('actions ',transfer.actions);
    //     const transferRecipt = transfer.actions[0] as SendMsgOutAction;
    //     // expect(res0.exit_code).toBe(0);
    //
    //     const reciptBody = transferRecipt.message.body ;
    //     console.log(reciptBody);
    //    // const res0 = await contract.initTestData(bobAddress)
    //
    //
    //     // Add liquidity take #1
    //     const reciptTons = transferRecipt.message.info.value?.coins as BN;
    //     console.log('reciptTons',reciptTons);
    //     console.log('tonCoins',tonCoins)
    //     console.log(reciptBody);
    //     const res = await contract.addLiquidityRaw(SUSHI_TOKEN_V2, bobAddress, tonCoins, reciptBody);
    //     console.log('addliquidityRaw', res);
    //     expect(res.exit_code).toBe(0)
    //     const liq1 = await contract.balanceOf(bobAddress);
    //     console.log(liq1.toString(10));
    //     expect(liq1).eqBN(baseLP);
    // });

    it('should Add Liquidity multiple times', async () => {
        const contract = await DexDebug.create(configData)
        
        const res0 = await contract.initTestData(bobAddress)
        expect(res0.exit_code).toBe(0);
        
        // Add liquidity take #1
        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(10), toDecimals(100), 2);
        expect(res.exit_code).toBe(0)

        const liq1 = await contract.balanceOf(bobAddress);
        expect(liq1).eqBN(baseLP);
        
        // // Add liquidity take #2
        const res2 = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress, toDecimals(10), toDecimals(100), 2);
        expect(res2.exit_code).toBe(0);
        
        const liq2 = await contract.balanceOf(bobAddress);
        expect(liq2.cmp( baseLP.mul( new BN(2)) )) .toBe(0);
        // // Add liquidity take #3 with 3x of the amounts
        const res3 = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress, toDecimals(30), toDecimals(300), 2);
        expect(res3.exit_code).toBe(0);
        
        // // Expect liquidity to be 
        const liq3 = await contract.balanceOf(bobAddress);
        expect(liq3).eqBN(baseLP.mul(new BN(5)));
    })
    
    it('should Add Liquidity and remove liquidity', async () => {
        
        const contract = await DexDebug.create(configData)
        const res0 = await contract.initTestData(bobAddress)
        expect(res0.exit_code).toBe(0)
        
        const TON_SIDE = toDecimals(10);
        const TOKEN_SIDE = toDecimals(100);
        
        // Add liquidity take #1
        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress, TON_SIDE, TOKEN_SIDE, 2);
        expect(res.exit_code).toBe(0);
        
        const liq1 = await contract.balanceOf(bobAddress);
        console.log('lp shares =', liq1.toString(10));
        expect(liq1.cmp(baseLP)).toBe(0);
        
        const tokenData = await contract.getData();
        console.log('tokenData.tokenReserves', fromDecimals(tokenData.tokenReserves) )
        
        expect( tokenData.tokenReserves.toString(10) ).toEqual(TOKEN_SIDE.toString(10))
        
        const removeResponse = await contract.removeLiquidity(bobAddress, liq1);
        expect(removeResponse.exit_code).toBe(0);
        console.log(removeResponse);
        
        //Message #1  sending TON to user  
        const messageOutputTonValue = removeResponse.actions[2] as SendMsgOutAction;
        const msgTonValue = messageOutputTonValue.message.info.value.coins;
        const sendTonMessage = messageOutputTonValue.message.info.dest;        
        console.log('output message destination' , messageOutputTonValue.message.info.dest?.toFriendly());
        console.log('messageOutputTonValue.message.info.value.coins' , fromDecimals(msgTonValue) ,'TON');
        expect(sendTonMessage?.toFriendly()).toEqual(bobAddress.toFriendly());
        expect(msgTonValue).eqBN(TON_SIDE);
        
        //Message #2 sending TOKEN to User
        const sendTokenMessage = removeResponse.actions[3] as SendMsgOutAction;
        const msgTokenDest = sendTokenMessage.message.info.dest;
        expect(msgTokenDest?.toFriendly()).toEqual(SUSHI_TOKEN_V2.toFriendly());

        const msgBody = parseTrc20Transfer(sendTokenMessage.message.body);
        expect( msgBody.amount).eqBN(TOKEN_SIDE);
        // TRC20 Validation
        expect( msgBody.to.equals(bobAddress)).toBe(true);
        expect( msgBody.amount).eqBN(TOKEN_SIDE);
        // validate target is equal to token contract

        const tokenBalanceAfterRemove = await contract.balanceOf(bobAddress);
        console.log('balance after remove ', fromDecimals(tokenBalanceAfterRemove) );
        // user LP balance should be 0
        expect(tokenBalanceAfterRemove).eqBN(new BN(0));
    });


    it('should Add Liquidity twice, and make sure rewards are claimed after the second add liquidity', async () => {
        const TON_SIDE = 10;
        const TOKEN_SIDE = 100;
        const contract = await DexDebug.create(configData)
        const res0 = await contract.initTestData(bobAddress)
        expect(res0.exit_code).toBe(0)
        const expectedRewards = configData.tokenAllocPoints.mul(toDecimals(10000000)).div(magic);
        
        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress, toDecimals(TON_SIDE), toDecimals(TOKEN_SIDE), 2);
        expect(res.exit_code).toBe(0);
        expect(res.actions.length).toBe(2);  //
        const liq1 = await contract.balanceOf(bobAddress);
        expect(liq1.cmp(baseLP)).toBe(0);

        contract.setUnixTime( toUnixTime(Date.now()) + ONE_DAY );
        const rewards = await contract.getRewards(bobAddress);
        expect(rewards).toBeBNcloseTo(expectedRewards, DUST);
        
        const res2 = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress, toDecimals(TON_SIDE), toDecimals(TOKEN_SIDE), 2);


        expect(res2.exit_code).toBe(0);
        expect(res2.actions.length).toBe(3);

        const rewardsAfterAddLiquidity = await contract.getRewards(bobAddress);
        expect(rewardsAfterAddLiquidity).eqBN(new BN(0));
    });
    
    
    it('should swap in TON->Token', async () => {
        const contract = await DexDebug.create(configData);
        await contract.initTestData(bobAddress);

        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(10), toDecimals(100), 2);
        
        const swap = await contract.swapIn(bobAddress, toDecimals(3), toDecimals(22))
        expect(swap.exit_code).toBe(0)
        expect(swap.actions.length).toBe(3);

        const messageOutputTonValue = swap.actions[2] as SendMsgOutAction;

        const tokenContract = messageOutputTonValue.message.info.dest;
        expect(tokenContract?.toFriendly()).toEqual(SUSHI_TOKEN_V2.toFriendly());
        expect(messageOutputTonValue.message.info.value.coins).eqBN(new BN(DEFAULT_FEE));

        const msgBody = parseTrc20Transfer(messageOutputTonValue.message.body);
        expect( msgBody.amount).eqBN(new BN(23023631745));
        expect( msgBody.to.equals(bobAddress)).toBe(true);

    }); 
    
    
    it('should swap Swap In Token->TON', async () => {
        // const contract = await DexDebug.create(configData);
        // await contract.initTestData(bobAddress);
        // const res = await contract.addLiquidity(KILO_TOKEN, bobAddress,  toDecimals(10), toDecimals(100), 2);
        //
        // const swap = await contract.swap(bobAddress, toDecimals(3), toDecimals(22))
        // expect(swap.exit_code).toBe(0)
        // expect(swap.actions.length).toBe(1);
        //
        // const messageOutputTonValue = swap.actions[0] as SendMsgOutAction;
        //
        // const tokenContract = messageOutputTonValue.message.info.dest;
        // expect(tokenContract?.toFriendly()).toEqual(KILO_TOKEN.toFriendly());
        // expect(messageOutputTonValue.message.info.value.coins).eqBN(new BN(10000000));
    }); 
    
    
    it('should Swap Out Token->TON', async () => {
        const contract = await DexDebug.create(configData);
        await contract.initTestData(bobAddress);

        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(10), toDecimals(100), 2);
        expect(res.exit_code).toBe(0)
        const expectedResult = new BN('3326659993');
        const minAmountOut = await contract.minAmountOut(toDecimals(50), true);

        expect(minAmountOut).eqBN(expectedResult)
        const swap = await contract.swapOut(bobAddress, SUSHI_TOKEN_V2, toDecimals(50), toDecimals(3));
        console.log(swap);

        expect(swap.exit_code).toBe(0);
        expect(swap.actions.length).toBe(3);

        const messageOutputTonValue = swap.actions[2] as SendMsgOutAction;
        const msgTonValue = messageOutputTonValue.message.info?.value?.coins;
        const messageTonDest = messageOutputTonValue.message.info.dest;
        //expect(messageTonDest.toFriendly()).toEqual(bobAddress.toFriendly());
        expect( msgTonValue).eqBN(expectedResult);
    });

    it('should claim rewards ', async () => {
        
        const expectedRewards = configData.tokenAllocPoints.mul(toDecimals(10000000)).div(magic);
        const contract = await DexDebug.create(configData)
        await contract.initTestData(bobAddress);

        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(1), toDecimals(100), 2);
        expect(res.exit_code).toBe(0);

        contract.setUnixTime( toUnixTime(Date.now()) + ONE_DAY );
        const rewards = await contract.getRewards(bobAddress);
        expect(rewards).toBeBNcloseTo(expectedRewards, DUST);

        const claimResponse = await contract.claimRewards(bobAddress);
        expect(claimResponse.exit_code).toBe(0);
        expect(claimResponse.actions.length).toBe(3);
        expect(claimResponse.rewards).toBeBNcloseTo(expectedRewards, DUST);
    });
    
    it('should claim rewards 2', async () => {
        // hard coded rewards for allocpoints 10
        const expectedRewards = configData.tokenAllocPoints.mul(toDecimals(10000000)).div(magic);

        const contract = await DexDebug.create(configData)
        await contract.initTestData(bobAddress);
        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(10), toDecimals(100), 2);
        expect(res.exit_code).toBe(0);
        const days = 12;

        contract.setUnixTime(toUnixTime(Date.now()) + (ONE_DAY * days));
        const rewards = await contract.getRewards(bobAddress);
        
        expect(rewards).toBeBNcloseTo(expectedRewards.mul(new BN(days)), DUST );

        const claimResponse2 = await contract.claimRewards(bobAddress);
        expect(claimResponse2.exit_code).toBe(0);
        //verify send token to message
        expect(claimResponse2.actions.length).toBe(3);

        expect(claimResponse2.rewards).toBeBNcloseTo(expectedRewards.mul(new BN(days)), DUST );
    });


    it('should claim rewards 3', async () => {
        
        const expectedRewards = configData.tokenAllocPoints.mul(toDecimals(10000000)).div(magic);

        const contract = await DexDebug.create(configData)
        await contract.initTestData(bobAddress);
        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(10), toDecimals(100), 2);
        expect(res.exit_code).toBe(0);
        
        //fast forward time 
        contract.setUnixTime( toUnixTime(Date.now()) + ONE_DAY );

        const rewards = await contract.getRewards(bobAddress);
        expect(rewards).toBeBNcloseTo(expectedRewards, DUST);

        const claimResponse = await contract.claimRewards(bobAddress);
        expect(claimResponse.exit_code).toBe(0);
        expect(claimResponse.actions.length).toBe(3);

        expect(claimResponse.rewards).toBeBNcloseTo(expectedRewards, DUST);

        const rewardsAfterWithdraw = await contract.getRewards(bobAddress);
        expect(rewardsAfterWithdraw.toNumber()).toBe(0);

        let days = 12 + 1;
        contract.setUnixTime(toUnixTime(Date.now()) + (ONE_DAY * days));
        const rewardsAfterWithdraw2 = await contract.getRewards(bobAddress);
        expect(rewardsAfterWithdraw2).toBeBNcloseTo(new BN(expectedRewards).mul( new BN (days-1)), DUST );

        const claimResponse2 = await contract.claimRewards(bobAddress);
        expect(claimResponse2.exit_code).toBe(0);
        //verify send token to message
        expect(claimResponse2.actions.length).toBe(3);
        expect(claimResponse2.rewards).toBeBNcloseTo(expectedRewards.mul(new BN(days-1)), DUST );
    });

    it('should claim protocol rewards', async () => {
        
        const testConfig = Object.assign(configData ,{
            tokenAllocPoints : new BN(0),
            protocolAllocPoints: new BN(300)
        }) as DexConfig;
        
        const expectedRewards = testConfig.protocolAllocPoints.mul(toDecimals(10000000)).div(magic);

        const contract = await DexDebug.create(testConfig)
        await contract.initTestData(bobAddress);
        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(10), toDecimals(100), 2);
        expect(res.exit_code).toBe(0);
        
        //move clock 24h
        contract.setUnixTime( toUnixTime(Date.now()) + ONE_DAY );

        const rewards = await contract.getRewards(bobAddress);
        expect(rewards).toBeBNcloseTo(expectedRewards, DUST);

        const claimResponse = await contract.claimRewards(bobAddress);
        expect(claimResponse.exit_code).toBe(0);
        expect(claimResponse.actions.length).toBe(3);
        
        expect(claimResponse.rewards).toBeBNcloseTo(expectedRewards, DUST);

        const rewardsAfterWithdraw = await contract.getRewards(bobAddress);
        expect(rewardsAfterWithdraw.toNumber()).toBe(0);

        let days = 12 + 1;
        contract.setUnixTime(toUnixTime(Date.now()) + (ONE_DAY * days));
        const rewardsAfterWithdraw2 = await contract.getRewards(bobAddress);
        expect(rewardsAfterWithdraw2).toBeBNcloseTo(expectedRewards.mul( new BN(days-1)), DUST);

        const claimResponse2 = await contract.claimRewards(bobAddress);
        expect(claimResponse2.exit_code).toBe(0);
        //verify send token to message
        expect(claimResponse2.actions.length).toBe(3);

        expect(claimResponse2.rewards).toBeBNcloseTo(expectedRewards.mul( new BN(days-1)), DUST);
    });



    it('should claim protocol and token rewards', async () => {
        
        const testConfig = Object.assign(configData ,{
            tokenAllocPoints : new BN(500),
        //    protocolAllocPoints: new BN(300)
        }) as DexConfig;
        
        const expectedProtocolRewards = testConfig.protocolAllocPoints.mul(toDecimals(10000000)).div(magic);
        const expectedTokenRewards = testConfig.tokenAllocPoints.mul(toDecimals(10000000)).div(magic);
        const expectedRewards = expectedProtocolRewards.add(expectedTokenRewards);

        const contract = await DexDebug.create(testConfig)
        await contract.initTestData(bobAddress);
        const res = await contract.addLiquidity(SUSHI_TOKEN_V2, bobAddress,  toDecimals(10), toDecimals(100), 2);
        expect(res.exit_code).toBe(0);
        
        //move clock 24h
        contract.setUnixTime( toUnixTime(Date.now()) + ONE_DAY );

        const rewards = await contract.getRewards(bobAddress);
        console.log('rewards', rewards.toString());
        expect(rewards).toBeBNcloseTo(expectedRewards, DUST);

        const claimResponse = await contract.claimRewards(bobAddress);
        console.log(claimResponse.logs);
        expect(claimResponse.exit_code).toBe(0);
        expect(claimResponse.actions.length).toBe(3);
        expect(claimResponse.rewards).toBeBNcloseTo(expectedRewards, DUST);

        const rewardsAfterWithdraw = await contract.getRewards(bobAddress);
        expect(rewardsAfterWithdraw.toNumber()).toBe(0);

        let days = 12 + 1;
        // contract.setUnixTime(toUnixTime(Date.now()) + (ONE_DAY * days));
        //
        // const rewardsAfterWithdraw2 = await contract.getRewards(bobAddress);
        // expect(rewardsAfterWithdraw2).toBeBNcloseTo(expectedRewards.mul( new BN(days-1)), new BN(8) );
        //
        // const claimResponse2 = await contract.claimRewards(bobAddress);
        // expect(claimResponse2.exit_code).toBe(0);
        // //verify send token to message
        // expect(claimResponse2.actions.length).toBe(3);
        // expect(claimResponse2.rewards).toBeBNcloseTo(expectedRewards.mul( new BN(days-1)), DUST );
    });


    it('should update token data', async () => {

        const contract = await DexDebug.create(configData)
        await contract.initTestData(bobAddress);

        const tokenDataInit = await contract.getAdminData();
        expect(tokenDataInit.admin.equals(configData.tokenAdmin)).toBe(true);
        expect(tokenDataInit.adminPoints.toNumber()).toEqual(configData.tokenAllocPoints.toNumber());
        expect(tokenDataInit.protocol.equals(configData.protocolAdmin)).toBe(true);
        expect(tokenDataInit.protocolPoints.toNumber()).toEqual(configData.protocolAllocPoints.toNumber());

        const newAllocPoints = 500;
        const newProtocolPoints = 700;

        const res = await contract.updateAdminData(TOKEN_ADMIN, OP_UPDATE_TOKEN_REWARDS, new BN(newAllocPoints));
        expect(res.exit_code).toBe(0);
        const tokenData = await contract.getAdminData();
        expect(tokenData.adminPoints.cmp(new BN(newAllocPoints))).toEqual(0);
        
        const res2 = await contract.updateAdminData(PROTOCOL_ADMIN, OP_UPDATE_PROTOCOL_REWARDS, new BN(newProtocolPoints));
        expect(res2.exit_code).toBe(0);
        const tokenData2 = await contract.getAdminData();
        expect(tokenData2.protocolPoints.cmp(new BN(newProtocolPoints))).toEqual(0);
        
    }) 

    it('should throw un authorized when trying to update token data from wrong address', async () => {
        const newAllocPoints = 500;
        const newProtocolPoints = 700;

        const contract = await DexDebug.create(configData)
    
        const res = await contract.updateAdminData(bobAddress, OP_UPDATE_TOKEN_REWARDS, new BN(newAllocPoints));
        expect(res.exit_code).toBe(401);
        const tokenData = await contract.getAdminData();
        // points should not update
        expect(tokenData.adminPoints).eqBN(new BN(configData.tokenAllocPoints));
        
        const res2 = await contract.updateAdminData(bobAddress, OP_UPDATE_PROTOCOL_REWARDS, new BN(newProtocolPoints));
        expect(res2.exit_code).toBe(402);
        const tokenData2 = await contract.getAdminData();
        // points should not update
        expect(tokenData2.protocolPoints).eqBN(new BN(configData.protocolAllocPoints));
        
    }) 
})

