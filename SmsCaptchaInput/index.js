/**
 * 短信验证码输入框组件
 *
 * 短信验证码输入框组件有三种状态：
 * 0：初始状态
 * 1：发送短信中状态
 * 2：倒计时状态
 * 3：倒计时结束状态
 *
 * 点击按钮会使组件由 `0：初始状态` 进入 `1：发送短信中状态`，
 * 此时需要根据接口状况进行判断：
 * 1、如果发送短信成功：手动调起组件的 `start` 方法，进入 `2：倒计时状态`，
 * 在倒计时结束时组件会自动进入 `3：倒计时结束状态`；
 * 2、如果发送短信失败：手动调起组件的 `stop` 方法，进入 `3：倒计时结束状态`；
 */
import React, { Component, PropTypes } from 'react';
import {
  Platform,
  AppState,
  View,
  TouchableOpacity,
  TextInput,
  Text,
} from 'react-native';

import {
  COLOR_PLACEHOLDER,
  ACTIVE_OPACITY,
} from '../constant';
import styles from './styles';

const NOOP = () => {};
const isIOS = Platform.OS === 'ios';

class SmsCaptchaInput extends Component {
  constructor(props) {
    super(props);

    this.time = props.intervalTime;
    this.state = {
      buttonText: props.btnTextInital,
      isRunning: false,
      sendSmsCount: 0,
    };

    this.onPress = this.onPress.bind(this);
    this.onChangeText = this.onChangeText.bind(this);
    this.timer = this.timer.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.getInput = this.getInput.bind(this);

    props.collectValidate(this.validate.bind(this));

    this.onAppStateChange = this.onAppStateChange.bind(this);
  }
  componentDidMount() {
    if (isIOS) {
      AppState.addEventListener('change', this.onAppStateChange);
    }
  }
  componentWillUnmount() {
    clearInterval(this.interval);
    if (isIOS) {
      AppState.removeEventListener('change', this.onAppStateChange);
    }
  }

  onAppStateChange(state) {
    if (state === 'inactive') {
      this.lastTimeStamp = +new Date();
    } else if (state === 'active') {
      if (this.lastTimeStamp) {
        const duration = Math.floor((+new Date() - this.lastTimeStamp) / 1000);
        this.time -= duration;
      }
    }
  }

  onChangeText(value) {
    this.value = value;
    this.props.onChangeText(value);
  }

  onPress() {
    // 检测是否处于点击发送短信状态
    if (this.state.isRunning) {
      return;
    }
    // 运行点击按钮回调
    if (this.props.onPressBtn(this.start, this.stop) === false) {
      return;
    }
    this.setState({
      isRunning: true,
      sendSmsCount: (this.state.sendSmsCount + 1),
      buttonText: this.props.btnTextSending,
    });
  }

  getInput(el) {
    this.props.getInput(el);
    this.input = el;
  }

  // 开始倒计时
  start() {
    this.time = this.props.intervalTime;
    this.interval = setInterval(this.timer, 1000);

    if (this.props.autoFocus && this.input) {
      this.input.focus();
    }
  }
  // 结束倒计时
  stop() {
    clearInterval(this.interval);
    this.setState({
      buttonText: this.props.btnTextTimed,
      isRunning: false,
    });
    this.props.onStop();
  }

  // 倒计时函数
  timer() {
    if (this.time > 0) {
      this.setState({
        buttonText: this.props.btnTextTiming.replace('{time}', this.time),
      });
      this.time -= 1;
    } else {
      this.stop();
    }
  }

  validate() {
    const value = this.value;
    const res = {
      name: this.props.name,
      value,
    };
    if (value === '' || value === undefined) {
      return {
        ...res,
        err: 1,
        errType: 'NO_EMPTY',
        msg: `${this.props.readableName}不能为空`,
      };
    }
    if (this.state.sendSmsCount === 0) {
      return {
        ...res,
        err: 1,
        errType: 'NO_SEND',
        msg: `请获取${this.props.readableName}`,
      };
    }
    if (value.length !== this.props.captchaLength) {
      return {
        ...res,
        err: 1,
        errType: 'LENGTH_NOT_ENOUGH',
        msg: `${this.props.readableName}需为${this.props.captchaLength}位`,
      };
    }

    return {
      ...res,
      err: 0,
      errType: '',
      msg: '成功',
    };
  }

  render() {
    return (
      <View style={[styles.container, this.props.style]}>
        <TextInput
          ref={this.getInput}
          clearButtonMode="never"
          keyboardType="numeric"
          onChangeText={this.onChangeText}
          placeholder={this.props.placeholder}
          placeholderTextColor={this.props.placeholderTextColor}
          style={[styles.input, this.props.inputStyle]}
          maxLength={this.props.captchaLength}
        />
        <TouchableOpacity
          activeOpacity={this.state.isRunning ? 1 : this.props.activeOpacity}
          onPress={this.onPress}
          style={[styles.button, this.props.btnStyle]}
          hitSlop={this.props.hitSlop}
        >
          <Text style={this.props.btnTextStyle}>
            {this.state.buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

SmsCaptchaInput.propTypes = {
  // 自定义样式
  style: View.propTypes.style,
  // 自定义输入框样式
  inputStyle: TextInput.propTypes.style,
  // 自定义按钮样式
  btnStyle: View.propTypes.style,
  // 按钮文字：初始状态
  btnTextInital: PropTypes.string,
  // 按钮文字：发送短信中
  btnTextSending: PropTypes.string,
  // 按钮文字：倒计时中，`{time}` 将会被替换为倒计时数字
  btnTextTiming: PropTypes.string,
  // 按钮文字：倒计时结束
  btnTextTimed: PropTypes.string,
  // 自定义按钮文本样式
  btnTextStyle: Text.propTypes.style,
  // 提示文字
  placeholder: PropTypes.string,
  // 提示文字颜色
  placeholderTextColor: PropTypes.string,
  // 按钮点击透明度
  activeOpacity: PropTypes.number,
  // 倒计时时间
  intervalTime: PropTypes.number,
  // 点击发送短信按钮回调，当返回 false 时，可以阻止倒计时开始；
  // 该回调接受两个参数：开始倒计时方法：`start` 和结束倒计时方法 `stop`
  onPressBtn: PropTypes.func,
  // 倒计时结束回调
  onStop: PropTypes.func,
  // 验证码校验长度
  captchaLength: PropTypes.number,
  // 校验器接口，值通常为叫校验器的校验手机方法
  collectValidate: PropTypes.func,
  // 用来在校验器中做标识
  name: PropTypes.string,
  // 用来在校验器中组成错误信息
  readableName: PropTypes.string,
  // 改变回调
  onChangeText: PropTypes.func,
  // 是否开启自动获取焦点（在 start 被调用时）
  autoFocus: PropTypes.bool,
  // 获取输入框
  getInput: PropTypes.func,
  // 发送短信按钮热区
  hitSlop: TouchableOpacity.propTypes.hitSlop,
};
SmsCaptchaInput.defaultProps = {
  style: null,
  inputStyle: null,
  btnStyle: null,
  btnTextInital: '获取验证码',
  btnTextSending: '正在发送短信',
  btnTextTiming: '{time}秒后可重发',
  btnTextTimed: '重新获取',
  btnTextStyle: null,
  placeholder: '短信验证码',
  placeholderTextColor: COLOR_PLACEHOLDER,
  activeOpacity: ACTIVE_OPACITY,
  intervalTime: 60,
  onPressBtn: NOOP,
  onStop: NOOP,
  captchaLength: 6,
  collectValidate: NOOP,
  name: 'SMS_CODE_INPUT',
  readableName: '短信验证码',
  onChangeText: NOOP,
  autoFocus: true,
  getInput: NOOP,
  hitSlop: null,
};

export default SmsCaptchaInput;
