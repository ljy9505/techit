import React, { useCallback, useEffect, useRef, useState} from "react";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import * as SplashScreen from "expo-splash-screen";
import {
  BackHandler,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
  Alert,
  ToastAndroid,
  Linking,
  PermissionsAndroid,
  NativeModules,
} from "react-native";
import messaging from "@react-native-firebase/messaging";

// Android에서 뒤로가기 버튼 두 번 클릭 시 종료 알림 띄우기
const toastWithDurationHandler = () => {
  ToastAndroid.show(
    "뒤로 버튼을 한번 더 누르시면 종료됩니다.",
    ToastAndroid.SHORT
  );
};

export default function App() {
  const [mainUrl, setMainUrl] = useState("");

  SplashScreen.preventAutoHideAsync();
  // SplashScreen 시간 설정하기
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 2000),
      [];
  });
  
  const androidRequestPermission = async () => {
    const authorizationStatus = await messaging().requestPermission();
    console.log('authorizationStatus:', authorizationStatus);
    try {
      const fcmToken = await messaging().getToken();
      if (Platform.OS === 'android') {
        console.log('get android FCM Token:', fcmToken);
        console.log(Platform.Version)
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA,PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES]);
            /*
             * 알림허용이 denied 일때, 알림 허용에 대한 재안내와 
             * 알림수신에 대한 요청을 다시 할 수 있는 내용 작성가능.
             * */
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Android 13이상 , 알림권한 허용.');
            setup
            if (fcmToken) {
              //토큰 수집
              NativeModules.DotReactBridge.setPushToken(fcmToken);
            } else {
              alert('Android 13');
              console.log('Android 13이하 , 알림권한 없음.');
            }
          }
        }
        // API 레벨 32 이하일 때
        try {
          if (fcmToken) {
            //토큰 수집
            NativeModules.DotReactBridge.setPushToken(fcmToken);
          }
        } catch (e) {
          console.log('android token API level 32 이하 error:', e);
        }
      }
    } catch (error) {
      console.log('Android error:', error);
    }
  };

  // 푸시 알림 보낼 토큰 값 받을 수 있는 지 유무 확인해서 메시지 보내기
  useEffect(() => {
    androidRequestPermission();

    messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage) {
          console.log(
            "Notification caused app to open from quit state:",
            remoteMessage.notification
          );
        }
      });

    messaging().onNotificationOpenedApp(async (remoteMessage) => {
      console.log(
        "Notification caused app to open from background state:",
        remoteMessage.notification
      );
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("Message handled in the background!", remoteMessage);
    });

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      Alert.alert("A new FCM message arrived!", JSON.stringify(remoteMessage));
    });

    return unsubscribe;
  }, []);

  const webview = useRef(null);

  // 페이지 이동 될 때 마다 url 받아오기
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    console.log("CurrentURL", url);
    setMainUrl(url);
  };

  // Android 뒤로가기 버튼 이벤트 발생
  useEffect(() => {
    BackHandler.addEventListener("hardwareBackPress", onAndroidBackPress);
    return () => {
      BackHandler.removeEventListener("hardwareBackPress", onAndroidBackPress);
    };
  }, [mainUrl]);

  // 어플 종료 플래그 설정
  let time = 0;

  // 백버튼 눌렸을 때 동작 설정
  const onAndroidBackPress = () => {
    if (!webview.current) {
      return;
    }
    if (mainUrl === "https://techit.education/") {
      console.log("나갈 수 있는 상태");
      time += 1;
      toastWithDurationHandler();
      if (time === 1) {
        setTimeout(() => (time = 0), 2000);
      } else if (time === 2) {
        console.log("어플종료");
        BackHandler.exitApp();
        return false;
      }
    } else {
      console.log("뒤로가기");
      webview.current.goBack();
      return true;
    }
    return true;
  };

  // 아이패드 회전 시 화면 자동 Resizing
  const [webViewHeight, setWebViewHeight] = useState(
    Dimensions.get("window").height
  );

  const handleLayout = useCallback(() => {
    const { height } = Dimensions.get("window");
    setWebViewHeight(height);
  }, []);

  useEffect(() => {
    const handleRotation = () => {
      const { height } = Dimensions.get("window");
      setWebViewHeight(height);
    };

    Dimensions.addEventListener("change", handleRotation);

    return () => {
      Dimensions.removeEventListener("change", handleRotation);
    };
  }, []);

  // 외부 링크 앱으로 리다이렉트 해주기
  const onShouldStartLoadWithRequest = (event) => {
    // 외부 링크 중 Hrd-net으로 가는 링크 브라우저 앱으로 빼기
    if (event.url.startsWith("https://bit")) {
      Linking.openURL(event.url);
      return false;
    }
    if (
      event.url.startsWith("http://") ||
      event.url.startsWith("https://") ||
      event.url.startsWith("about:blank") ||
      event.url.includes("pf.kakao.com")
    ) {
      console.log("여기 1진입");
      return true;
    }
    if( event.url.startsWith("http://")){
      Linking.openURL(event.url.replace("http","https"));
      console.log("여기 2진입");
      return true;
    }
    if (event.url.includes("apply")) {
      webview.current.reload();
      return false;
    }
    if (
      Platform.OS === "android" &&
      Linking.canOpenURL(event.url) &&
      event.url.startsWith("intent")
    ) {
      Linking.openURL(event.url.replace("intent", "kakaolink:"));
      return false;
    } else {
      Linking.openURL(event.url).catch((err) => {
        alert(
          "앱 실행이 실패했습니다. 설치가 되어 있지 않은 경우 설치해주세요."
        );
      });
      return false;
    }
  };

  // Android 화면 크기 다르게 설정해주기
  const isAndroid = Platform.OS === "android";
  const screenHeight = Dimensions.get("window").height;

  // 안드로이드 환경에서 클릭 시 파란 박스 없애기
  const injectedJavaScript = `
      const style = document.createElement('style');
      style.innerHTML = 'body { -webkit-tap-highlight-color: rgba(0,0,0,0); outline:none; }';
      document.head.appendChild(style);
    `;

  return (
    <SafeAreaView style={styles.container}>
      {isAndroid && <SafeAreaView style={{ height: screenHeight * 0.05 }} />}
      <StatusBar barStyle="light-content"></StatusBar>
      <WebView
        ref={webview}
        style={{ flex: 1 }}
        // onLayout={handleLayout}
        originWhitelist={["*"]}
        onShouldStartLoadWithRequest={(event) => {
          return onShouldStartLoadWithRequest(event);
        }}
        source={{ uri: "https://techit.education" }}
        // 23.12.07 스와이핑으로 뒤로가기, 앞으로가기 API 추가
        allowsBackForwardNavigationGestures={true}
        // 23.12.08 BackGround Video가 전체화면에서 자동재생 되는 현상 막는 코드 추가
        allowsInlineMediaPlayback={true}
        scalesPageToFit={true}
        onNavigationStateChange={handleNavigationStateChange}
        allowsFullscreenVideo={true}
        mixedContentMode="compatibility"
        injectedJavaScript={injectedJavaScript}
        setSupportMultipleWindows={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
