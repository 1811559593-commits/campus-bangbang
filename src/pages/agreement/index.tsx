import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './index.module.scss';

const sections: { title: string; paragraphs: string[] }[] = [
  {
    title: '一、平台定位',
    paragraphs: [
      '「校园帮帮」是面向校园场景的跑腿任务信息撮合与信誉记录工具，仅提供任务信息发布、展示、匹配及用户信誉记录服务。',
      '本平台不参与订单报酬的收取、支付、结算与担保，不介入交易双方的线下交付过程，不提供任何形式的资金托管或中介服务。'
    ]
  },
  {
    title: '二、用户行为规范',
    paragraphs: [
      '用户应使用真实身份信息注册与使用本服务，不得冒用他人身份。',
      '发布的任务内容应合法、真实、明确，不得发布违反法律法规、公序良俗或侵犯他人权益的内容。',
      '用户应遵守校园管理规定，不得利用本平台从事影响教学秩序、校园安全的活动。',
      '用户应自行判断接单人/发单人的可靠性并谨慎交易，本平台不对交易结果作任何承诺或担保。'
    ]
  },
  {
    title: '三、信息费与道具服务',
    paragraphs: [
      '当前模式验证阶段，平台不收取接单信息费，订单报酬由交易双方线下自行结算。',
      '平台提供「加急卡」等虚拟道具服务，用于任务信息置顶展示。道具购买后即时生效，不支持退款（法律法规另有规定除外）。',
      '如后续恢复接单信息费或调整道具价格，平台将在显著位置公示，用户继续使用视为接受变更。'
    ]
  },
  {
    title: '四、信誉与评价',
    paragraphs: [
      '平台基于交易完成情况、用户评价、违规记录等维度计算信誉分与完成率，供其他用户参考。',
      '用户应客观、真实地进行评价，不得恶意刷单、刷评或诋毁他人。',
      '信誉分过低的用户将被限制接单等功能，具体规则以平台公示为准。'
    ]
  },
  {
    title: '五、免责声明',
    paragraphs: [
      '因交易双方线下交付产生的任何纠纷、损失或人身财产损害，均由交易双方自行协商解决或依法处理，本平台不承担任何责任。',
      '因不可抗力（包括但不限于自然灾害、网络故障、系统维护、微信平台政策调整等）导致服务中断或数据丢失，本平台不承担责任。',
      '用户因自身原因（包括但不限于密码泄露、操作失误、线下交易风险等）造成的损失，由用户自行承担。',
      '本平台不对用户发布的信息真实性、准确性、合法性作出保证，用户应自行甄别并承担相应风险。'
    ]
  },
  {
    title: '六、隐私与个人信息保护',
    paragraphs: [
      '本平台仅收集为提供服务所必需的信息（如微信昵称、头像、openid、联系方式等），并采取合理措施保护用户信息安全。',
      '用户的联系方式仅在接单流程中按规则向交易对方展示，不会向无关第三方泄露。',
      '用户可通过个人中心申请注销账号，注销后平台将按法律法规要求处理相关数据。'
    ]
  },
  {
    title: '七、违规处理',
    paragraphs: [
      '用户违反本协议或平台规则的，平台有权采取警告、限制功能、封禁账号等措施，并保留追究法律责任的权利。',
      '因用户违规行为给平台或第三方造成损失的，用户应承担全部赔偿责任。'
    ]
  },
  {
    title: '八、协议变更',
    paragraphs: [
      '本平台有权根据法律法规变化及业务发展需要修改本协议，修改后的协议将在平台内公示。',
      '用户继续使用本服务即视为接受修改后的协议；如不同意，可停止使用并注销账号。'
    ]
  },
  {
    title: '九、争议解决',
    paragraphs: [
      '本协议的解释与适用均适用中华人民共和国法律。',
      '因本协议或本服务产生的争议，双方应友好协商解决；协商不成的，任何一方可向平台运营方所在地有管辖权的人民法院提起诉讼。'
    ]
  }
];

const AgreementPage: React.FC = () => {
  return (
    <ScrollView scrollY className={styles.page}>
      <Text className={styles.title}>平台服务与免责声明</Text>
      <Text className={styles.updateTime}>更新日期：2026年9月17日</Text>
      {sections.map((section) => (
        <View key={section.title} className={styles.section}>
          <Text className={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((p, i) => (
            <Text key={i} className={styles.paragraph}>{p}</Text>
          ))}
        </View>
      ))}
      <View className={styles.footer}>
        <Text className={styles.footerText}>使用本服务即视为您已阅读并同意上述全部条款。</Text>
      </View>
    </ScrollView>
  );
};

export default AgreementPage;
